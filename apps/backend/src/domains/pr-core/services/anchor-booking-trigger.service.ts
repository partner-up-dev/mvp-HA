import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import {
  isBookingExecutionPendingStatus,
  isPlatformHandledBookingResource,
} from "../../pr-booking-support";

const prRepo = new PartnerRequestRepository();
const anchorPRRepo = new AnchorPRRepository();
const partnerRepo = new PartnerRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();

export async function syncAnchorBookingTriggeredState(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR") {
    return;
  }

  const anchor = await anchorPRRepo.findByPrId(prId);
  if (!anchor) {
    throw new HTTPException(500, { message: "Anchor PR subtype row missing" });
  }

  const slots = await partnerRepo.findByPrId(prId);
  const activeSlots = slots.filter((slot) =>
    slot.status === "JOINED" ||
    slot.status === "CONFIRMED" ||
    slot.status === "ATTENDED",
  );
  const resources = await prSupportRepo.findByPrId(prId);
  const minPartners = request.minPartners ?? 1;
  const hasEnoughActive = activeSlots.length >= minPartners;
  const hasPlatformHandledResource = resources.some(
    isPlatformHandledBookingResource,
  );
  const shouldTrigger =
    hasEnoughActive &&
    hasPlatformHandledResource &&
    isBookingExecutionPendingStatus(request.status);

  if (shouldTrigger) {
    if (anchor.bookingTriggeredAt) {
      return;
    }

    const triggeredAt = new Date();
    await anchorPRRepo.updateBookingTriggeredAt(prId, triggeredAt);

    const event = await eventBus.publish(
      "anchor.pr.booking_triggered",
      "partner_request",
      String(prId),
      {
        prId,
        activePartnerCount: activeSlots.length,
        bookingTriggeredAt: triggeredAt.toISOString(),
      },
    );
    void writeToOutbox(event);

    operationLogService.log({
      actorId: null,
      action: "anchor.pr.booking_triggered",
      aggregateType: "partner_request",
      aggregateId: String(prId),
      detail: {
        activePartnerCount: activeSlots.length,
        bookingTriggeredAt: triggeredAt.toISOString(),
      },
    });
    return;
  }

  if (anchor.bookingTriggeredAt) {
    await anchorPRRepo.updateBookingTriggeredAt(prId, null);
  }
}
