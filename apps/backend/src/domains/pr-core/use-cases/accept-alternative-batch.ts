import { HTTPException } from "hono/http-exception";
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
  throw new HTTPException(410, {
    message: "Alternative batch recovery has retired from the live PR flow",
  });
}
