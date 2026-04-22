/**
 * Use-case: Get a single Anchor Event with its batches and PRs.
 * Returns the event detail with batches organized by time window.
 * PR discovery now reads from the root PR table by event type plus time window.
 */

import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  TimeWindowEntry,
  UserLocationEntry,
} from "../../../entities/anchor-event";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";
import type { PRStatus, PartnerRequest } from "../../../entities/partner-request";
import {
  isActiveVisibleAnchorPRStatus,
  readVisiblePartnerRequestsByTypeAndTime,
} from "../../pr-core/services/pr-read.service";

const eventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const partnerRepo = new PartnerRepository();

export interface AnchorPRSummary {
  id: number;
  title: string | null;
  type: string;
  location: string | null;
  preferences: string[];
  notes: string | null;
  time: [string | null, string | null];
  status: PRStatus;
  minPartners: number | null;
  maxPartners: number | null;
  partnerCount: number;
  createdAt: string;
}

export interface BatchDetail {
  id: number;
  timeWindow: [string | null, string | null];
  status: string;
  description: string | null;
  prs: AnchorPRSummary[];
  locationOptions: LocationOption[];
}

export interface LocationOption {
  locationId: string;
  remainingQuota: number;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED";
}

export interface AnchorEventDetail {
  id: number;
  title: string;
  type: string;
  description: string | null;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  systemLocationPool: string[];
  userLocationPool: UserLocationEntry[];
  timeWindowPool: TimeWindowEntry[];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: string;
  batches: BatchDetail[];
  exhausted: boolean;
  createdAt: string;
}

const toPRSummary = (pr: PartnerRequest): AnchorPRSummary => ({
  id: pr.id,
  title: pr.title,
  type: pr.type,
  location: pr.location,
  preferences: Array.isArray(pr.preferences) ? pr.preferences : [],
  notes: pr.notes,
  time: pr.time,
  status: pr.status,
  minPartners: pr.minPartners,
  maxPartners: pr.maxPartners,
  partnerCount: 0,
  createdAt: pr.createdAt.toISOString(),
});

const toBatchDetail = (
  batch: AnchorEventBatch,
  prs: PartnerRequest[],
  locationOptions: LocationOption[],
): BatchDetail => ({
  id: batch.id,
  timeWindow: batch.timeWindow,
  status: batch.status,
  description: batch.description,
  prs: prs.map(toPRSummary),
  locationOptions,
});

const isEventScopedLocation = (
  event: AnchorEvent,
  location: string | null,
): boolean => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  const systemLocationPool = normalizeSystemLocationPool(event.systemLocationPool);
  if (systemLocationPool.includes(normalized)) {
    return true;
  }

  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  return userLocationPool.some((entry) => entry.id === normalized);
};

export async function getAnchorEventDetail(
  eventId: AnchorEventId,
): Promise<AnchorEventDetail> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const batches = await batchRepo.findByAnchorEventId(eventId);
  const systemLocationPool = normalizeSystemLocationPool(
    event.systemLocationPool,
  );
  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);

  const batchDetails: BatchDetail[] = [];
  const allPRIds: number[] = [];

  for (const batch of batches) {
    const prs = (
      await readVisiblePartnerRequestsByTypeAndTime(event.type, batch.timeWindow)
    ).filter((pr) => isEventScopedLocation(event, pr.location));

    const activeUserCountsByLocation = new Map<string, number>();
    for (const pr of prs) {
      if (!isActiveVisibleAnchorPRStatus(pr.status)) continue;
      const location = pr.location?.trim();
      if (!location) continue;
      if (!userLocationPool.some((entry) => entry.id === location)) continue;

      activeUserCountsByLocation.set(
        location,
        (activeUserCountsByLocation.get(location) ?? 0) + 1,
      );
    }

    const locationOptions: LocationOption[] = [];
    for (const userLocation of userLocationPool) {
      const activeCount = activeUserCountsByLocation.get(userLocation.id) ?? 0;
      const remainingQuota = Math.max(
        userLocation.perBatchCap - activeCount,
        0,
      );
      const disabled = remainingQuota === 0;
      locationOptions.push({
        locationId: userLocation.id,
        remainingQuota,
        disabled,
        disabledReason: disabled ? "MAX_REACHED" : "NONE",
      });
    }

    const detail = toBatchDetail(batch, prs, locationOptions);
    allPRIds.push(...detail.prs.map((pr) => pr.id));
    batchDetails.push(detail);
  }

  const activePartnerCounts = await partnerRepo.countActiveByPrIds(allPRIds);
  for (const batchDetail of batchDetails) {
    for (const pr of batchDetail.prs) {
      pr.partnerCount = activePartnerCounts.get(pr.id) ?? 0;
    }
  }

  const totalLocations = systemLocationPool.length;
  const totalBatches = batches.length;
  const totalSlots = totalLocations * totalBatches;

  let occupiedSlots = 0;
  for (const batchDetail of batchDetails) {
    const activePRs = batchDetail.prs.filter((pr) =>
      isActiveVisibleAnchorPRStatus(pr.status),
    );
    occupiedSlots += activePRs.filter((pr) =>
      systemLocationPool.includes(pr.location ?? ""),
    ).length;
  }

  const systemExhausted = totalSlots > 0 && occupiedSlots >= totalSlots;
  const hasUserManagedCapacity = batchDetails.some((batchDetail) =>
    batchDetail.locationOptions.some((option) => option.remainingQuota > 0),
  );
  const exhausted = systemExhausted && !hasUserManagedCapacity;

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    description: event.description,
    defaultMinPartners: event.defaultMinPartners ?? null,
    defaultMaxPartners: event.defaultMaxPartners ?? null,
    systemLocationPool,
    userLocationPool,
    timeWindowPool: Array.isArray(event.timeWindowPool)
      ? event.timeWindowPool
      : [],
    coverImage: event.coverImage,
    betaGroupQrCode: event.betaGroupQrCode,
    status: event.status,
    batches: batchDetails,
    exhausted,
    createdAt: event.createdAt.toISOString(),
  };
}
