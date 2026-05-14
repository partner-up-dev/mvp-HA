import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatusManual } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { isActivatableStatus } from "../services/status-rules";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reminder.service";

const prRepo = new PartnerRequestRepository();

export async function updatePRStatus(
  id: PRId,
  status: PRStatusManual,
  actorUserId: UserId | null,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const currentStatus = refreshedRequest.status as string;
  if (
    status === "ACTIVE" &&
    currentStatus !== "ACTIVE" &&
    !isActivatableStatus(currentStatus)
  ) {
    return throwHttpProblem({ status: 400, detail: "Cannot set ACTIVE - only READY, FULL, or LOCKED_TO_START can become ACTIVE" });
  }

  const updated = await prRepo.updateStatus(id, status);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to update status" });
  }

  operationLogService.log({
    actorId: actorUserId,
    action: "pr.update_status",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { fromStatus: currentStatus, toStatus: status },
  });

  await scheduleAlternativeWaitlistNotificationsForCandidate(updated);

  return toPublicPR(updated, null);
}
