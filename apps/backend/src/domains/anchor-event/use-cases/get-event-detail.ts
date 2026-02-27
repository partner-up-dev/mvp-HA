/**
 * Use-case: Get a single Anchor Event with its batches and PRs.
 * Returns the event detail with batches organized by time window,
 * each containing its Anchor PRs.
 */

import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  AnchorEventId,
  LocationEntry,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";
import type { PartnerRequest } from "../../../entities/partner-request";

const eventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AnchorPRSummary {
  id: number;
  title: string | null;
  type: string;
  location: string | null;
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
}

export interface AnchorEventDetail {
  id: number;
  title: string;
  type: string;
  description: string | null;
  locationPool: LocationEntry[];
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

function toPRSummary(pr: PartnerRequest): AnchorPRSummary {
  return {
    id: pr.id,
    title: pr.title,
    type: pr.type,
    location: pr.location,
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
  prs: PartnerRequest[],
): BatchDetail {
  return {
    id: batch.id,
    timeWindow: batch.timeWindow,
    status: batch.status,
    prs: prs.map(toPRSummary),
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

  // Fetch PRs for each batch
  const batchDetails: BatchDetail[] = [];
  for (const batch of batches) {
    const prs = await prRepo.findByBatchId(batch.id);
    const detail = toBatchDetail(batch, prs);
    for (const pr of detail.prs) {
      pr.partnerCount = await partnerRepo.countActiveByPrId(pr.id);
    }
    batchDetails.push(detail);
  }

  // Check exhaustion: all location × timeWindow combos are occupied (have a non-expired PR)
  const locationPool = Array.isArray(event.locationPool)
    ? event.locationPool
    : [];
  const totalLocations = locationPool.length;
  const totalBatches = batches.length;
  const totalSlots = totalLocations * totalBatches;

  // Count occupied slots (PRs that are not expired/closed)
  let occupiedSlots = 0;
  for (const bd of batchDetails) {
    const activePRs = bd.prs.filter(
      (pr) => pr.status !== "EXPIRED" && pr.status !== "CLOSED",
    );
    occupiedSlots += activePRs.length;
  }

  const exhausted = totalSlots > 0 && occupiedSlots >= totalSlots;

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    description: event.description,
    locationPool: locationPool,
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
