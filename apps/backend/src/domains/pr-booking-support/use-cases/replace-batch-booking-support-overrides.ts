import type {
  AnchorEventBatchId,
  AnchorEventBatchSupportOverride,
  NewAnchorEventBatchSupportOverride,
} from "../../../entities";
import { AnchorEventBatchSupportOverrideRepository } from "../../../repositories/AnchorEventBatchSupportOverrideRepository";

const batchOverrideRepo = new AnchorEventBatchSupportOverrideRepository();

export async function replaceBatchBookingSupportOverrides(
  batchId: AnchorEventBatchId,
  rows: Omit<NewAnchorEventBatchSupportOverride, "batchId">[],
): Promise<AnchorEventBatchSupportOverride[]> {
  return await batchOverrideRepo.replaceByBatchId(
    batchId,
    rows.map((row) => ({
      ...row,
      batchId,
    })),
  );
}
