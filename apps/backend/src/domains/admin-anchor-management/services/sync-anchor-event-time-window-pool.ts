import type { AnchorEventId, TimeWindowEntry } from "../../../entities";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

const compareTimeWindow = (
  left: [string | null, string | null],
  right: [string | null, string | null],
): number => {
  const leftStart = left[0] ?? "";
  const rightStart = right[0] ?? "";
  if (leftStart !== rightStart) {
    return leftStart.localeCompare(rightStart);
  }

  const leftEnd = left[1] ?? "";
  const rightEnd = right[1] ?? "";
  return leftEnd.localeCompare(rightEnd);
};

export async function syncAnchorEventTimeWindowPool(
  anchorEventId: AnchorEventId,
): Promise<TimeWindowEntry[]> {
  const batches = await batchRepo.findByAnchorEventId(anchorEventId);
  const nextTimeWindowPool = [...batches]
    .map((batch) => [batch.timeWindow[0], batch.timeWindow[1]] as TimeWindowEntry)
    .sort(compareTimeWindow);

  await anchorEventRepo.update(anchorEventId, {
    timeWindowPool: nextTimeWindowPool,
  });

  return nextTimeWindowPool;
}
