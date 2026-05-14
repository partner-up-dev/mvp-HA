import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import type { PRId, VisibilityStatus } from "../../../entities";

const eventContextRepo = new AnchorEventPRContextRepository();

export async function updateAdminPRVisibility(
  prId: PRId,
  visibilityStatus: VisibilityStatus,
): Promise<void> {
  const record = await eventContextRepo.findRecordByPrId(prId);
  if (!record) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  await eventContextRepo.updateVisibilityStatus(prId, visibilityStatus);
}
