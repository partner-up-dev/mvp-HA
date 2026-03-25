import { HTTPException } from "hono/http-exception";
import type { PartnerId, PRId, UserId } from "../../../entities";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { cancelWeChatReminderJobsForParticipant } from "../../../infra/notifications";
import { recalculatePRStatus } from "../../pr-core/services/slot-management.service";
import { syncAnchorBookingTriggeredState } from "../../pr-core/services/anchor-booking-trigger.service";
import { resolveBookingContactState } from "../../pr-booking-support";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const anchorPRRepo = new AnchorPRRepository();
const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();
const bookingContactRepo = new AnchorPRBookingContactRepository();

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

export async function releaseAdminAnchorPRPartner(input: {
  prId: PRId;
  partnerId: PartnerId;
  reason: string;
  actorUserId: UserId | null;
}) {
  const reason = normalizeManualReason(input.reason);
  const record = await anchorPRRepo.findRecordByPrId(input.prId);
  if (!record || record.root.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
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

  const bookingContact = await bookingContactRepo.findByPrId(input.prId);
  const bookingContactCleared =
    bookingContact !== null && bookingContact.ownerPartnerId === releasedSlot.id;
  if (bookingContactCleared) {
    await bookingContactRepo.deleteByPrId(input.prId);
  }

  let creatorTransferredToUserId = record.root.createdBy ?? null;
  if (record.root.createdBy && record.root.createdBy === slot.userId) {
    const activeParticipants =
      await partnerRepo.listActiveParticipantSummariesByPrId(input.prId);
    const successor = activeParticipants[0] ?? null;
    creatorTransferredToUserId = successor?.userId ?? null;
    await prRepo.setCreatedBy(input.prId, creatorTransferredToUserId);
  }

  await recalculatePRStatus(input.prId);
  await syncAnchorBookingTriggeredState(input.prId);
  await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: null,
  });

  const event = await eventBus.publish(
    "partner.slot_released",
    "partner_request",
    String(input.prId),
    {
      prId: input.prId,
      partnerId: releasedSlot.id,
      reason: "manual",
      trigger: "admin_manual",
      manualReason: reason,
    },
  );
  void writeToOutbox(event);

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
      bookingContactCleared,
      creatorTransferredToUserId,
    },
  });

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
