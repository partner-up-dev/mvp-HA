import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { isExitAllowedStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import {
  hasEventStarted,
  isBookingDeadlineReached,
} from "../services/time-window.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { getEffectiveBookingDeadline } from "../../pr-booking-support";
import { resolveBookingContactState } from "../../pr-booking-support";
import { syncAnchorBookingTriggeredState } from "../services/anchor-booking-trigger.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function exitPRByUserId(
  id: PRId,
  userId: UserId,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (refreshedRequest.createdBy === userId) {
    throw new HTTPException(400, {
      message: "Cannot exit - creator cannot exit own partner request",
    });
  }

  if (!isExitAllowedStatus(refreshedRequest.status as string)) {
    throw new HTTPException(400, {
      message: "Cannot exit - partner request is not open",
    });
  }

  const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(id, userId);
  if (!activeSlot) {
    throw new HTTPException(400, {
      message: "Cannot exit - partner is not joined",
    });
  }

  if (
    refreshedRequest.prKind === "ANCHOR" &&
    (activeSlot.status === "CONFIRMED" || activeSlot.status === "ATTENDED")
  ) {
    const effectiveBookingDeadlineAt = await getEffectiveBookingDeadline(id);
    if (isBookingDeadlineReached(effectiveBookingDeadlineAt)) {
      throw new HTTPException(400, {
        message: "Cannot exit - slot is locked after booking deadline",
      });
    }
  }

  if (refreshedRequest.prKind === "ANCHOR" && hasEventStarted(refreshedRequest.time)) {
    throw new HTTPException(400, {
      message: "Cannot exit - event has already started",
    });
  }

  await partnerRepo.updateStatus(activeSlot.id, "EXITED");
  await userReliabilityRepo.applyDelta(userId, { released: 1 });
  if (refreshedRequest.prKind === "ANCHOR") {
    await cancelWeChatReminderJobsForParticipant(id, userId);
    await cancelWeChatActivityStartReminderJobsForParticipant(id, userId);
    await resolveBookingContactState({
      prId: id,
      viewerUserId: userId,
    });
  }
  await recalculatePRStatus(id);
  await syncAnchorBookingTriggeredState(id);

  // Emit domain event
  const event = await eventBus.publish(
    "partner.exited",
    "partner_request",
    String(id),
    { prId: id, partnerId: activeSlot.id, userId },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: userId,
    action: "partner.exit",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: activeSlot.id },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }
  return toPublicPR(latest, userId);
}

export async function exitPR(id: PRId, openId: string): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return exitPRByUserId(id, user.id);
}
