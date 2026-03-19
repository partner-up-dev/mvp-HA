/**
 * Use-case: Get a single Anchor Event with its batches and PRs.
 * Returns the event detail with batches organized by time window,
 * each containing its Anchor PRs.
 */

import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import {
  AnchorPRRepository,
  type AnchorPRRecord,
} from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  AnchorEventId,
  TimeWindowEntry,
  UserLocationEntry,
} from "../../../entities/anchor-event";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";
import type { PartnerRequest } from "../../../entities/partner-request";

const eventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();
const partnerRepo = new PartnerRepository();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AnchorPRSummary {
  id: number;
  title: string | null;
  type: string;
  location: string | null;
  preferences: string[];
  time: [string | null, string | null];
  status: string;
  minPartners: number | null;
  maxPartners: number | null;
  partnerCount: number;
  createdAt: string;
}

export interface BatchDetail {
  id: number;
  timeWindow: [string | null, string | null];
  status: string;
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
  systemLocationPool: string[];
  userLocationPool: UserLocationEntry[];
  timeWindowPool: TimeWindowEntry[];
  coverImage: string | null;
  status: string;
  batches: BatchDetail[];
  /** True when all time-window × location combos are occupied */
  exhausted: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPRSummary(record: AnchorPRRecord): AnchorPRSummary {
  const pr = record.root;
  return {
    id: pr.id,
    title: pr.title,
    type: pr.type,
    location: pr.location,
    preferences: Array.isArray(pr.preferences) ? pr.preferences : [],
    time: pr.time,
    status: pr.status,
    minPartners: pr.minPartners,
    maxPartners: pr.maxPartners,
    partnerCount: 0, // will be enriched below
    createdAt: pr.createdAt.toISOString(),
  };
}

function toBatchDetail(
  batch: AnchorEventBatch,
  prs: AnchorPRRecord[],
  locationOptions: LocationOption[],
): BatchDetail {
  return {
    id: batch.id,
    timeWindow: batch.timeWindow,
    status: batch.status,
    prs: prs.map(toPRSummary),
    locationOptions,
  };
}

// ---------------------------------------------------------------------------
// Use-case
// ---------------------------------------------------------------------------

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

  // Fetch PRs for each batch
  const batchDetails: BatchDetail[] = [];
  for (const batch of batches) {
    const prs = await anchorPRRepo.findVisibleByBatchId(batch.id);
    const locationOptions: LocationOption[] = [];
    for (const userLocation of userLocationPool) {
      const activeCount =
        await anchorPRRepo.countActiveVisibleByBatchAndLocationSource(
          batch.id,
          userLocation.id,
          "USER",
        );
      const remainingQuota = Math.max(userLocation.perBatchCap - activeCount, 0);
      const disabled = remainingQuota === 0;
      locationOptions.push({
        locationId: userLocation.id,
        remainingQuota,
        disabled,
        disabledReason: disabled ? "MAX_REACHED" : "NONE",
      });
    }

    const detail = toBatchDetail(batch, prs, locationOptions);
    for (const pr of detail.prs) {
      pr.partnerCount = await partnerRepo.countActiveByPrId(pr.id);
    }
    batchDetails.push(detail);
  }

  // Check exhaustion: all location × timeWindow combos are occupied (have a non-expired PR)
  const totalLocations = systemLocationPool.length;
  const totalBatches = batches.length;
  const totalSlots = totalLocations * totalBatches;

  // Count occupied slots (PRs that are not expired/closed)
  let occupiedSlots = 0;
  for (const bd of batchDetails) {
    const activePRs = bd.prs.filter(
      (pr) => pr.status !== "EXPIRED" && pr.status !== "CLOSED",
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
    systemLocationPool,
    userLocationPool,
    timeWindowPool: Array.isArray(event.timeWindowPool)
      ? event.timeWindowPool
      : [],
    coverImage: event.coverImage,
    status: event.status,
    batches: batchDetails,
    exhausted,
    createdAt: event.createdAt.toISOString(),
  };
}
