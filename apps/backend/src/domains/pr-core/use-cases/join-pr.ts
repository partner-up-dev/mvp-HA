import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRId } from "../../../entities/partner-request";
import type { PartnerStatus } from "../../../entities/partner";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import {
  isJoinLockedByTime,
  shouldAutoConfirmImmediately,
} from "../services/time-window.service";
import { isJoinableStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function joinPR(id: PRId, openId: string): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (isJoinLockedByTime(refreshedRequest.time)) {
    throw new HTTPException(400, {
      message: "Cannot join - event is locked after T-30min",
    });
  }

  if (!isJoinableStatus(refreshedRequest.status as string)) {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is not open",
    });
  }

  const user = await resolveUserByOpenId(openId);
  if (user.status !== "ACTIVE") {
    throw new HTTPException(403, { message: "Current user is not active" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (existing) {
    if (
      existing.status === "JOINED" &&
      shouldAutoConfirmImmediately(refreshedRequest.time)
    ) {
      await partnerRepo.markConfirmed(existing.id);
    }
    const latest = await prRepo.findById(id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to reload partner request",
      });
    }
    return toPublicPR(latest, user.id);
  }

  const activeCount = await partnerRepo.countActiveByPrId(id);
  if (
    refreshedRequest.maxPartners !== null &&
    activeCount >= refreshedRequest.maxPartners
  ) {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is full",
    });
  }

  const targetStatus: PartnerStatus = shouldAutoConfirmImmediately(
    refreshedRequest.time,
  )
    ? "CONFIRMED"
    : "JOINED";

  let assignedPartnerId: number;
  const released = await partnerRepo.findFirstReleasedSlot(id);
  if (released) {
    await partnerRepo.assignSlot(released.id, user.id, targetStatus);
    assignedPartnerId = released.id;
  } else if (refreshedRequest.maxPartners === null) {
    const created = await partnerRepo.createSlot({
      prId: id,
      userId: user.id,
      status: targetStatus,
    });
    assignedPartnerId = created!.id;
  } else {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is full",
    });
  }

  await recalculatePRStatus(id);

  // Emit domain event
  const event = await eventBus.publish(
    "partner.joined",
    "partner_request",
    String(id),
    {
      prId: id,
      partnerId: assignedPartnerId,
      userId: user.id,
      autoConfirmed: targetStatus === "CONFIRMED",
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: user.id,
    action: "partner.join",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: assignedPartnerId, status: targetStatus },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }
  return toPublicPR(latest, user.id);
}
