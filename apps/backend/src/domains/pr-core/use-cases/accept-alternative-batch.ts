import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";

export interface AcceptAlternativeBatchResult {
  batchId: number | null;
  prId: number;
  createdBatch: boolean;
  createdPr: boolean;
}

export async function acceptAlternativeBatch(
  sourcePrId: PRId,
  _targetTimeWindow: [string | null, string | null],
): Promise<AcceptAlternativeBatchResult> {
  return throwHttpProblem({ status: 410, detail: "Alternative batch recovery has retired from the live PR flow" });
}
