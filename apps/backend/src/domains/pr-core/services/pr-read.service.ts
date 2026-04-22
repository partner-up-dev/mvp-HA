/**
 * PR read service with explicit consistency modes:
 * - strong: await status synchronization before returning results
 * - eventual: return current snapshot and schedule a background sync
 */

import {
  AnchorPRRepository,
  type AnchorPRRecord,
} from "../../../repositories/AnchorPRRepository";
import type { AnchorLocationSource } from "../../../entities/anchor-partner-request";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import type { TimeWindowEntry } from "../../../entities/anchor-event";
import type { PRId, PRStatus, PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { refreshTemporalStatus } from "../temporal-refresh";

export type PRReadConsistency = "strong" | "eventual";

const anchorPRRepo = new AnchorPRRepository();
const prRepo = new PartnerRequestRepository();

const applyEventualRefresh = (request: PartnerRequest): void => {
  void refreshTemporalStatus(request).catch(() => {
    // Intentionally swallow errors for eventual consistency mode.
  });
};

const applyConsistencyToRequest = async (
  request: PartnerRequest,
  consistency: PRReadConsistency,
): Promise<PartnerRequest> => {
  if (consistency === "eventual") {
    applyEventualRefresh(request);
    return request;
  }
  return refreshTemporalStatus(request);
};

const applyConsistencyToRequests = async (
  requests: PartnerRequest[],
  consistency: PRReadConsistency,
): Promise<PartnerRequest[]> => {
  if (consistency === "eventual") {
    requests.forEach((request) => {
      applyEventualRefresh(request);
    });
    return requests;
  }
  return Promise.all(requests.map((request) => refreshTemporalStatus(request)));
};

export const isActiveVisibleAnchorPRStatus = (status: PRStatus | string): boolean =>
  status !== "CLOSED" && status !== "EXPIRED";

export async function readPartnerRequestById(
  id: PRId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest | null> {
  const request = await prRepo.findById(id);
  if (!request) return null;
  return applyConsistencyToRequest(request, options.consistency ?? "strong");
}

export async function readPartnerRequestsByIds(
  ids: PRId[],
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findByIds(ids);
  return applyConsistencyToRequests(rows, options.consistency ?? "strong");
}

export async function readPartnerRequestsByCreatorId(
  userId: UserId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findByCreatorId(userId);
  return applyConsistencyToRequests(rows, options.consistency ?? "strong");
}

export async function readVisiblePartnerRequestsByTypeAndTime(
  type: string,
  timeWindow: TimeWindowEntry,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findVisibleByTypeAndTime(type, timeWindow);
  return applyConsistencyToRequests(rows, options.consistency ?? "strong");
}

const applyConsistencyToAnchorRecords = async (
  records: AnchorPRRecord[],
  consistency: PRReadConsistency,
): Promise<AnchorPRRecord[]> => {
  const syncedRoots = await applyConsistencyToRequests(
    records.map((record) => record.root),
    consistency,
  );
  return records.map((record, index) => ({
    ...record,
    root: syncedRoots[index]!,
  }));
};

export async function readVisibleAnchorPRRecordsByBatchId(
  batchId: AnchorEventBatchId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findVisibleByBatchId(batchId);
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function readVisibleAnchorPRRecordsByAnchorEventId(
  anchorEventId: AnchorEventId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findVisibleByAnchorEventId(anchorEventId);
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function readAnchorPRRecordsByBatchId(
  batchId: AnchorEventBatchId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findByBatchId(batchId);
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function readVisibleAnchorPRRecordsByBatchIdAndLocation(
  batchId: AnchorEventBatchId,
  location: string,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorPRRecord[]> {
  const records = await anchorPRRepo.findVisibleByBatchIdAndLocation(
    batchId,
    location,
  );
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function countActiveVisibleAnchorPRsByBatchAndLocationSource({
  batchId,
  location,
  locationSource,
  excludePrId,
  consistency,
}: {
  batchId: AnchorEventBatchId;
  location: string;
  locationSource: AnchorLocationSource;
  excludePrId?: PRId;
  consistency?: PRReadConsistency;
}): Promise<number> {
  const records = await readVisibleAnchorPRRecordsByBatchIdAndLocation(
    batchId,
    location,
    { consistency },
  );
  return records.filter((record) => {
    if (record.anchor.locationSource !== locationSource) return false;
    if (excludePrId !== undefined && record.root.id === excludePrId) return false;
    return isActiveVisibleAnchorPRStatus(record.root.status);
  }).length;
}
