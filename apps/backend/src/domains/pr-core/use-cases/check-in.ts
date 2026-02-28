import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { hasEventStarted } from "../services/time-window.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

export async function checkIn(
  id: PRId,
  openId: string,
  payload: { didAttend: boolean; wouldJoinAgain: boolean | null },
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (!hasEventStarted(refreshedRequest.time)) {
    throw new HTTPException(400, {
      message: "Cannot check in - event has not started",
    });
  }

  const user = await resolveUserByOpenId(openId);
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot) {
    throw new HTTPException(400, {
      message: "Cannot check in - partner is not joined",
    });
  }

  const updatedSlot = await partnerRepo.reportCheckIn(slot.id, payload);
  if (!updatedSlot) {
    throw new HTTPException(500, { message: "Failed to submit check-in" });
  }
  if (payload.didAttend && slot.status !== "ATTENDED") {
    await userRepo.applyReliabilityDelta(user.id, { attended: 1 });
  }

  // Emit domain event
  const event = await eventBus.publish(
    "partner.checked_in",
    "partner_request",
    String(id),
    {
      prId: id,
      partnerId: slot.id,
      userId: user.id,
      didAttend: payload.didAttend,
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: user.id,
    action: "partner.check_in",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: slot.id, didAttend: payload.didAttend },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to refresh partner request after check-in",
    });
  }
  return toPublicPR(latest, user.id);
}
