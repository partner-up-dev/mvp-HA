import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { isExitAllowedStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import { isBookingDeadlineReached } from "../services/time-window.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { cancelWeChatReminderJobsForParticipant } from "../../../infra/notifications";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

export async function exitPR(id: PRId, openId: string): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (!isExitAllowedStatus(refreshedRequest.status as string)) {
    throw new HTTPException(400, {
      message: "Cannot exit - partner request is not open",
    });
  }

  const user = await resolveUserByOpenId(openId);
  const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!activeSlot) {
    throw new HTTPException(400, {
      message: "Cannot exit - partner is not joined",
    });
  }

  if (
    isBookingDeadlineReached(refreshedRequest.resourceBookingDeadlineAt) &&
    (activeSlot.status === "CONFIRMED" || activeSlot.status === "ATTENDED")
  ) {
    throw new HTTPException(400, {
      message: "Cannot exit - slot is locked after booking deadline",
    });
  }

  await partnerRepo.markReleased(activeSlot.id);
  await userRepo.applyReliabilityDelta(user.id, { released: 1 });
  await cancelWeChatReminderJobsForParticipant(id, user.id);
  await recalculatePRStatus(id);

  // Emit domain event
  const event = await eventBus.publish(
    "partner.exited",
    "partner_request",
    String(id),
    { prId: id, partnerId: activeSlot.id, userId: user.id },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: user.id,
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
  return toPublicPR(latest, user.id);
}
