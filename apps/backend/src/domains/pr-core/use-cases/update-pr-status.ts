import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatusManual } from "../../../entities/partner-request";
import { isActivatableStatus } from "../services/status-rules";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();

export async function updatePRStatus(
  id: PRId,
  status: PRStatusManual,
  pin: string,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const isValid = await bcrypt.compare(pin, refreshedRequest.pinHash);
  if (!isValid) {
    throw new HTTPException(403, { message: "Invalid PIN" });
  }

  const currentStatus = refreshedRequest.status as string;
  if (
    status === "ACTIVE" &&
    currentStatus !== "ACTIVE" &&
    !isActivatableStatus(currentStatus)
  ) {
    throw new HTTPException(400, {
      message: "Cannot set ACTIVE - only READY or FULL can become ACTIVE",
    });
  }

  const updated = await prRepo.updateStatus(id, status);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update status" });
  }

  // Emit domain event
  const event = await eventBus.publish(
    "pr.status_changed",
    "partner_request",
    String(id),
    {
      prId: id,
      fromStatus: currentStatus,
      toStatus: status,
      trigger: "manual",
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: null,
    action: "pr.update_status",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { fromStatus: currentStatus, toStatus: status },
  });

  return toPublicPR(updated, null);
}
