import type { AnchorEventId, TimeWindowEntry } from "../../../entities";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { buildAnchorEventTimeWindowPoolFromBatches } from "../../anchor-event/services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

export async function syncAnchorEventTimeWindowPool(
  anchorEventId: AnchorEventId,
): Promise<TimeWindowEntry[]> {
  const batches = await batchRepo.findByAnchorEventId(anchorEventId);
  const nextTimeWindowPool = buildAnchorEventTimeWindowPoolFromBatches(batches);

  await anchorEventRepo.update(anchorEventId, {
    timeWindowPool: nextTimeWindowPool,
  });

  return nextTimeWindowPool;
}
