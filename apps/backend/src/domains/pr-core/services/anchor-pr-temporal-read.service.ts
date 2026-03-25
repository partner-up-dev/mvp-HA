/**
 * Anchor PR read helpers that guarantee temporal status refresh before
 * downstream status-based decisions (cards, quota checks, candidate selection).
 */

import {
  AnchorPRRepository,
  type AnchorPRRecord,
} from "../../../repositories/AnchorPRRepository";
import type { AnchorLocationSource } from "../../../entities/anchor-partner-request";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import { refreshTemporalStatus } from "../temporal-refresh";

const anchorPRRepo = new AnchorPRRepository();

export const isActiveVisibleAnchorPRStatus = (status: PRStatus | string): boolean =>
  status !== "CLOSED" && status !== "EXPIRED";

export async function refreshAnchorPRRecords(
  records: AnchorPRRecord[],
): Promise<AnchorPRRecord[]> {
  return Promise.all(
    records.map(async (record) => {
      const refreshedRoot = await refreshTemporalStatus(record.root);
      return {
        ...record,
        root: refreshedRoot,
      };
    }),
  );
}

export async function listVisibleAnchorPRRecordsByBatchIdWithTemporalRefresh(
  batchId: AnchorEventBatchId,
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findVisibleByBatchId(batchId);
  return refreshAnchorPRRecords(records);
}

export async function listVisibleAnchorPRRecordsByBatchIdAndLocationWithTemporalRefresh(
  batchId: AnchorEventBatchId,
  location: string,
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findVisibleByBatchIdAndLocation(
    batchId,
    location,
  );
  return refreshAnchorPRRecords(records);
}

export async function countActiveVisibleAnchorPRsByBatchAndLocationSourceWithTemporalRefresh({
  batchId,
  location,
  locationSource,
  excludePrId,
}: {
  batchId: AnchorEventBatchId;
  location: string;
  locationSource: AnchorLocationSource;
  excludePrId?: PRId;
}): Promise<number> {
  const records =
    await listVisibleAnchorPRRecordsByBatchIdAndLocationWithTemporalRefresh(
      batchId,
      location,
    );
  return records.filter((record) => {
    if (record.anchor.locationSource !== locationSource) return false;
    if (excludePrId !== undefined && record.root.id === excludePrId) return false;
    return isActiveVisibleAnchorPRStatus(record.root.status);
  }).length;
}
