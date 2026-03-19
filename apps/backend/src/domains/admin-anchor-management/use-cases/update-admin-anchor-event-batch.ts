import { HTTPException } from "hono/http-exception";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type {
  AnchorEventBatch,
  AnchorEventBatchId,
  AnchorEventBatchStatus,
} from "../../../entities";
import { syncAnchorEventTimeWindowPool } from "../services/sync-anchor-event-time-window-pool";

const batchRepo = new AnchorEventBatchRepository();

export interface UpdateAdminAnchorEventBatchInput {
  timeWindow: [string | null, string | null];
  status: AnchorEventBatchStatus;
}

export async function updateAdminAnchorEventBatch(
  batchId: AnchorEventBatchId,
  input: UpdateAdminAnchorEventBatchInput,
): Promise<AnchorEventBatch> {
  const current = await batchRepo.findById(batchId);
  if (!current) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const updated = await batchRepo.update(batchId, {
    timeWindow: input.timeWindow,
    status: input.status,
  });

  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update anchor event batch" });
  }

  await syncAnchorEventTimeWindowPool(current.anchorEventId);
  return updated;
}
