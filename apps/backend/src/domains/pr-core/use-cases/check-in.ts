import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../../user";
import { hasAnchorParticipationPolicy } from "../services/anchor-participation-policy.service";
import { hasEventStarted } from "../services/time-window.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function checkIn(
  id: PRId,
  openId: string,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  if (!hasAnchorParticipationPolicy(refreshedRequest)) {
    throw new HTTPException(400, {
      message: "Check-in is not available for this partner request",
    });
  }

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

  const updatedSlot = await partnerRepo.reportCheckIn(slot.id);
  if (!updatedSlot) {
    throw new HTTPException(500, { message: "Failed to submit check-in" });
  }
  if (slot.status !== "ATTENDED") {
    await userReliabilityRepo.applyDelta(user.id, { attended: 1 });
  }

  operationLogService.log({
    actorId: user.id,
    action: "partner.check_in",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: slot.id, didAttend: true },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to refresh partner request after check-in",
    });
  }
  return toPublicPR(latest, user.id);
}
