import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { resetPRJoinGateResolutionsForUser } from "../services/join-gates.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function cancelWaitlistPRByUserId(
  id: PRId,
  userId: UserId,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  await refreshTemporalStatus(request);

  const pendingSlot = await partnerRepo.findPendingByPrIdAndUserId(id, userId);
  if (!pendingSlot) {
    throw new HTTPException(400, {
      message: "Cannot cancel waitlist - partner is not waitlisted",
    });
  }

  const cancelledSlot = await partnerRepo.cancelPendingSlot(pendingSlot.id);
  if (!cancelledSlot) {
    throw new HTTPException(409, {
      message: "Cannot cancel waitlist - slot is no longer pending",
    });
  }

  await resetPRJoinGateResolutionsForUser({
    prId: id,
    userId,
    partnerId: pendingSlot.id,
  });

  operationLogService.log({
    actorId: userId,
    action: "partner.waitlist_cancel",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: pendingSlot.id },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }
  return toPublicPR(latest, userId);
}
