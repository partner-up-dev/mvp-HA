import { HTTPException } from "hono/http-exception";
import type { PartnerId, PRId, UserId } from "../../../entities";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import {
  applyAnchorParticipantReleaseEffects,
  promoteWaitlistedPartners,
  recalculatePRStatus,
  syncAnchorBookingTriggeredState,
} from "../../pr/services";
import { operationLogService } from "../../../infra/operation-log";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../../pr-core/services/waitlist-alternative-reminder.service";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { resolveBookingContactState } from "../../pr-booking-support";

const eventContextRepo = new AnchorEventPRContextRepository();
const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const userReliabilityRepo = new UserReliabilityRepository();

const isReleaseableStatus = (status: string): boolean =>
  status === "JOINED" || status === "CONFIRMED";

const normalizeManualReason = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HTTPException(400, {
      message: "Release reason is required",
    });
  }
  return trimmed;
};

export async function releaseAdminPRPartner(input: {
  prId: PRId;
  partnerId: PartnerId;
  reason: string;
  actorUserId: UserId | null;
}) {
  const reason = normalizeManualReason(input.reason);
  const record = await eventContextRepo.findRecordByPrId(input.prId);
  if (!record) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  const slot = await partnerRepo.findById(input.partnerId);
  if (!slot || slot.prId !== input.prId) {
    throw new HTTPException(404, { message: "Partner slot not found" });
  }

  if (!isReleaseableStatus(slot.status)) {
    throw new HTTPException(400, {
      message: "Only JOINED or CONFIRMED slots can be released manually",
    });
  }

  const bookingContactBeforeRelease = await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: null,
  });
  const bookingContactPhone = bookingContactBeforeRelease.fullPhone;
  const bookingContactOwnerUserIdToClear =
    bookingContactBeforeRelease.ownerUserId === slot.userId ? slot.userId : null;

  const releasedSlot = await partnerRepo.markReleased(slot.id, {
    releaseReason: reason,
  });
  if (!releasedSlot) {
    throw new HTTPException(500, {
      message: "Failed to release partner slot",
    });
  }

  await userReliabilityRepo.applyDelta(slot.userId, { released: 1 });
  await cancelWeChatReminderJobsForParticipant(input.prId, slot.userId);
  await cancelWeChatActivityStartReminderJobsForParticipant(
    input.prId,
    slot.userId,
  );

  const { bookingContactCleared, creatorTransferredToUserId } =
    await applyAnchorParticipantReleaseEffects({
      prId: input.prId,
      releasedUserIds: [slot.userId],
      bookingContactOwnerUserIdToClear,
    });

  await recalculatePRStatus(input.prId);
  await syncAnchorBookingTriggeredState(input.prId);

  operationLogService.log({
    actorId: input.actorUserId,
    action: "partner.admin_manual_release",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      partnerId: releasedSlot.id,
      releasedUserId: slot.userId,
      previousStatus: slot.status,
      currentStatus: releasedSlot.status,
      trigger: "admin_manual",
      manual: true,
      reason,
      bookingContactPhone,
      bookingContactCleared,
      creatorTransferredToUserId,
    },
  });
  if (bookingContactCleared && bookingContactOwnerUserIdToClear) {
    operationLogService.log({
      actorId: input.actorUserId,
      action: "user.phone_number_cleared",
      aggregateType: "user",
      aggregateId: bookingContactOwnerUserIdToClear,
      detail: {
        prId: input.prId,
        partnerId: releasedSlot.id,
        trigger: "admin_manual_release",
        reason,
      },
    });
  }

  await promoteWaitlistedPartners(input.prId);
  const latest = await prRepo.findById(input.prId);
  if (latest) {
    await scheduleAlternativeWaitlistNotificationsForCandidate(latest);
  }

  return {
    ok: true as const,
    prId: input.prId,
    partnerId: releasedSlot.id,
    previousStatus: slot.status,
    currentStatus: releasedSlot.status,
    reason,
    bookingContactCleared,
    creatorTransferredToUserId,
  };
}
