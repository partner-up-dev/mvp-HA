import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatusManual } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { isActivatableStatus } from "../services/status-rules";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();

export async function updatePRStatus(
  id: PRId,
  status: PRStatusManual,
  actorUserId: UserId | null,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const currentStatus = refreshedRequest.status as string;
  if (
    status === "ACTIVE" &&
    currentStatus !== "ACTIVE" &&
    !isActivatableStatus(currentStatus)
  ) {
    throw new HTTPException(400, {
      message:
        "Cannot set ACTIVE - only READY, FULL, or LOCKED_TO_START can become ACTIVE",
    });
  }

  const updated = await prRepo.updateStatus(id, status);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update status" });
  }

  operationLogService.log({
    actorId: actorUserId,
    action: "pr.update_status",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { fromStatus: currentStatus, toStatus: status },
  });

  return toPublicPR(updated, null);
}
