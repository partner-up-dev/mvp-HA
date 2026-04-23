import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../../user";
import {
  hasAnchorParticipationPolicy,
  isWithinConfirmationWindow,
  resolveAnchorParticipationPolicy,
} from "../services/anchor-participation-policy.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { syncAnchorBookingTriggeredState } from "../services/anchor-booking-trigger.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function confirmSlot(id: PRId, openId: string): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  if (!hasAnchorParticipationPolicy(refreshedRequest)) {
    throw new HTTPException(400, {
      message: "Slot confirmation is not available for this partner request",
    });
  }
  const policy = resolveAnchorParticipationPolicy(
    refreshedRequest,
    refreshedRequest.time,
  );
  if (!isWithinConfirmationWindow(policy)) {
    throw new HTTPException(400, {
      message: "Cannot confirm - outside confirmation window",
    });
  }

  const user = await resolveUserByOpenId(openId);
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot) {
    throw new HTTPException(400, {
      message: "Cannot confirm - partner is not joined",
    });
  }

  if (slot.status === "JOINED") {
    await partnerRepo.markConfirmed(slot.id);
    await userReliabilityRepo.applyDelta(user.id, { confirmed: 1 });
    await syncAnchorBookingTriggeredState(id);

    // Emit domain event
    const event = await eventBus.publish(
      "partner.confirmed",
      "partner_request",
      String(id),
      { prId: id, partnerId: slot.id, userId: user.id },
    );
    void writeToOutbox(event);

    operationLogService.log({
      actorId: user.id,
      action: "partner.confirm",
      aggregateType: "partner_request",
      aggregateId: String(id),
      detail: { partnerId: slot.id },
    });
  }

  const latest = await prRepo.findById(refreshedRequest.id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to refresh partner request after confirm",
    });
  }
  return toPublicPR(latest, user.id);
}
