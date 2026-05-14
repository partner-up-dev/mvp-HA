import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { updatePRStatus } from "../../pr";
import type { PRId, PRStatusManual } from "../../../entities";

const eventContextRepo = new AnchorEventPRContextRepository();

export async function updateAdminPRStatus(
  prId: PRId,
  status: PRStatusManual,
) {
  const record = await eventContextRepo.findRecordByPrId(prId);
  if (!record) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  return await updatePRStatus(prId, status, null);
}
