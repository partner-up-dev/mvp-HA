/**
 * Use-case: Get a single Anchor Event with its discoverable PRs.
 * Public event detail groups discoverable PRs by time-window facts rather than
 * exposing batch rows as the public contract.
 */

import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
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
import type { PRStatus, PartnerRequest } from "../../../entities/partner-request";
import {
  isActiveVisibleAnchorPRStatus,
  readVisiblePartnerRequestsByTypeAndTime,
} from "../../pr-core/services/pr-read.service";

const eventRepo = new AnchorEventRepository();
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

export interface TimeWindowDetail {
  key: string;
  timeWindow: [string | null, string | null];
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
  timeWindows: TimeWindowDetail[];
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

const buildTimeWindowKey = (timeWindow: TimeWindowEntry): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

const toTimeWindowDetail = (
  timeWindow: TimeWindowEntry,
  prs: PartnerRequest[],
  locationOptions: LocationOption[],
): TimeWindowDetail => ({
  key: buildTimeWindowKey(timeWindow),
  timeWindow,
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

  const systemLocationPool = normalizeSystemLocationPool(
    event.systemLocationPool,
  );
  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  const timeWindowPool = Array.isArray(event.timeWindowPool)
    ? event.timeWindowPool
    : [];

  const timeWindowDetails: TimeWindowDetail[] = [];
  const allPRIds: number[] = [];

  for (const timeWindow of timeWindowPool) {
    const prs = (
      await readVisiblePartnerRequestsByTypeAndTime(event.type, timeWindow)
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

    const detail = toTimeWindowDetail(timeWindow, prs, locationOptions);
    allPRIds.push(...detail.prs.map((pr) => pr.id));
    timeWindowDetails.push(detail);
  }

  const activePartnerCounts = await partnerRepo.countActiveByPrIds(allPRIds);
  for (const timeWindowDetail of timeWindowDetails) {
    for (const pr of timeWindowDetail.prs) {
      pr.partnerCount = activePartnerCounts.get(pr.id) ?? 0;
    }
  }

  const totalLocations = systemLocationPool.length;
  const totalTimeWindows = timeWindowPool.length;
  const totalSlots = totalLocations * totalTimeWindows;

  let occupiedSlots = 0;
  for (const timeWindowDetail of timeWindowDetails) {
    const activePRs = timeWindowDetail.prs.filter((pr) =>
      isActiveVisibleAnchorPRStatus(pr.status),
    );
    occupiedSlots += activePRs.filter((pr) =>
      systemLocationPool.includes(pr.location ?? ""),
    ).length;
  }

  const systemExhausted = totalSlots > 0 && occupiedSlots >= totalSlots;
  const hasUserManagedCapacity = timeWindowDetails.some((timeWindowDetail) =>
    timeWindowDetail.locationOptions.some((option) => option.remainingQuota > 0),
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
    timeWindows: timeWindowDetails,
    exhausted,
    createdAt: event.createdAt.toISOString(),
  };
}
