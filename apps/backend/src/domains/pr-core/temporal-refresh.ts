/**
 * Temporal status refresh — shared helper for use-cases that need to
 * ensure a PR's status reflects the current time before proceeding.
 */

import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { AnchorPRRepository } from "../../repositories/AnchorPRRepository";
import { UserReliabilityRepository } from "../../repositories/UserReliabilityRepository";
import type { PartnerRequest } from "../../entities/partner-request";
import {
  getTimeWindowStart,
  getTimeWindowClose,
  isBookingDeadlineReached,
} from "./services/time-window.service";
import {
  hasConfirmationWindowEnded,
  resolveAnchorParticipationPolicy,
} from "./services/anchor-participation-policy.service";
import {
  isActivatableStatus,
  isExpirableStatus,
} from "./services/status-rules";
import {
  listActiveParticipantSummariesForPR,
  recalculatePRStatus,
} from "./services/slot-management.service";
import { cancelWeChatReminderJobsForParticipant } from "../../infra/notifications";
import { operationLogService } from "../../infra/operation-log";
import { getEffectiveBookingDeadline } from "../pr-booking-support";
import { syncAnchorBookingTriggeredState } from "./services/anchor-booking-trigger.service";
import { applyAnchorParticipantReleaseEffects } from "./services/anchor-participant-release-effects.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const anchorPRRepo = new AnchorPRRepository();
const userReliabilityRepo = new UserReliabilityRepository();

/**
 * Refresh a PR's temporal state: release unconfirmed slots, activate if
 * within window, expire if past window-close.
 */
export async function refreshTemporalStatus(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  const effectiveBookingDeadlineAt =
    request.prKind === "ANCHOR"
      ? await getEffectiveBookingDeadline(request.id)
      : null;

  await releaseUnconfirmedSlotsIfNeeded(request);
  const afterRelease = await prRepo.findById(request.id);
  const normalized = afterRelease ?? request;

  await syncAnchorBookingTriggeredState(request.id);
  const afterSync = await prRepo.findById(request.id);
  const syncNormalized = afterSync ?? normalized;

  await expireIfUnderMinAfterBookingDeadline(
    syncNormalized,
    effectiveBookingDeadlineAt,
  );
  const afterDeadlineExpire = await prRepo.findById(request.id);
  const deadlineNormalized = afterDeadlineExpire ?? syncNormalized;

  await lockToStartIfNeeded(deadlineNormalized, effectiveBookingDeadlineAt);
  const afterLock = await prRepo.findById(request.id);
  const lockNormalized = afterLock ?? deadlineNormalized;

  const activated = await activateIfNeeded(lockNormalized);
  return expireIfNeeded(activated);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function activateIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isActivatableStatus(request.status as string)) return request;

  const windowStart = getTimeWindowStart(request.time);
  if (!windowStart) return request;

  const now = Date.now();
  if (windowStart.getTime() > now) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (windowClose && windowClose.getTime() <= now) return request;

  const updated = await prRepo.updateStatus(request.id, "ACTIVE");
  return updated ?? request;
}

async function expireIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isExpirableStatus(request.status as string)) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (!windowClose) return request;
  if (windowClose.getTime() > Date.now()) return request;

  const updated = await prRepo.updateStatus(request.id, "EXPIRED");
  return updated ?? request;
}

function shouldLockToStart(
  request: PartnerRequest,
  resourceBookingDeadlineAt: Date | null,
): boolean {
  if (request.prKind !== "ANCHOR") {
    return false;
  }
  if (
    request.status !== "OPEN" &&
    request.status !== "READY" &&
    request.status !== "FULL"
  ) {
    return false;
  }
  return isBookingDeadlineReached(resourceBookingDeadlineAt);
}

async function lockToStartIfNeeded(
  request: PartnerRequest,
  resourceBookingDeadlineAt: Date | null,
): Promise<void> {
  if (!shouldLockToStart(request, resourceBookingDeadlineAt)) return;

  const updated = await prRepo.updateStatus(request.id, "LOCKED_TO_START");
  if (!updated || updated.status !== "LOCKED_TO_START") return;

  operationLogService.log({
    actorId: null,
    action: "pr.status.locked_to_start",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: {
      previousStatus: request.status,
      resourceBookingDeadlineAt: resourceBookingDeadlineAt?.toISOString() ?? null,
      trigger: "booking_deadline",
    },
  });
}

async function expireIfUnderMinAfterBookingDeadline(
  request: PartnerRequest,
  resourceBookingDeadlineAt: Date | null,
): Promise<void> {
  if (request.prKind !== "ANCHOR") return;
  if (!isBookingDeadlineReached(resourceBookingDeadlineAt)) return;

  const slots = await partnerRepo.findByPrId(request.id);
  const activeCount = slots.filter(
    (slot) =>
      slot.status === "JOINED" ||
      slot.status === "CONFIRMED" ||
      slot.status === "ATTENDED",
  ).length;
  const minPartners = request.minPartners ?? 1;
  if (activeCount >= minPartners) return;

  const updated = await prRepo.updateStatus(request.id, "EXPIRED");
  if (!updated || updated.status !== "EXPIRED") return;

  operationLogService.log({
    actorId: null,
    action: "pr.status.expired_under_min_active",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: {
      activeCount,
      minPartners,
      resourceBookingDeadlineAt: resourceBookingDeadlineAt?.toISOString() ?? null,
      trigger: "booking_deadline",
    },
  });
}

async function resolveReleaseTrigger(
  request: PartnerRequest,
): Promise<"confirmation_end" | null> {
  if (request.prKind !== "ANCHOR") {
    return null;
  }

  const anchor = await anchorPRRepo.findByPrId(request.id);
  if (!anchor) return null;
  const policy = resolveAnchorParticipationPolicy(anchor, request.time);
  if (!hasConfirmationWindowEnded(policy)) return null;
  return "confirmation_end";
}

async function releaseUnconfirmedSlotsIfNeeded(
  request: PartnerRequest,
): Promise<void> {
  const trigger = await resolveReleaseTrigger(request);
  if (!trigger) return;

  const participants = await listActiveParticipantSummariesForPR(request.id);
  const releasing = participants.filter((slot) => slot.status === "JOINED");
  if (releasing.length === 0) return;
  const releasedUserIds = releasing.map((slot) => slot.userId);

  for (const slot of releasing) {
    await userReliabilityRepo.applyDelta(slot.userId, { released: 1 });
    await cancelWeChatReminderJobsForParticipant(request.id, slot.userId);
    await partnerRepo.markReleased(slot.partnerId);

    operationLogService.log({
      actorId: slot.userId,
      action: "partner.auto_release_unconfirmed",
      aggregateType: "partner_request",
      aggregateId: String(request.id),
      detail: {
        partnerId: slot.partnerId,
        trigger,
      },
    });
  }

  await recalculatePRStatus(request.id);
  if (request.prKind === "ANCHOR") {
    await applyAnchorParticipantReleaseEffects({
      prId: request.id,
      releasedUserIds,
    });
  }
}
