/**
 * Use-case: Get a single Anchor Event with event-owned create assistance and
 * same-type PR browsing data.
 */

import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { AnchorEventId, TimeWindowEntry } from "../../../entities/anchor-event";
import { normalizeLocationPool } from "../../../entities/anchor-event";
import type { PRStatus, PartnerRequest } from "../../../entities/partner-request";
import {
  isActiveVisiblePRStatus,
  isTimeWindowAvailableByPoiRules,
  readVisiblePartnerRequestsByType,
  readVisiblePartnerRequestsByTypeAndTime,
} from "../../pr/services";
import { listAnchorEventTimeWindows } from "../services/time-window-pool";

const eventRepo = new AnchorEventRepository();
const partnerRepo = new PartnerRepository();
const poiRepo = new PoiRepository();

export interface EventPRSummary {
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

export interface BrowseTimeWindowDetail {
  key: string;
  timeWindow: [string | null, string | null];
  prs: EventPRSummary[];
}

export interface CreateTimeWindowDetail {
  key: string;
  timeWindow: [string | null, string | null];
  locationOptions: LocationOption[];
}

export interface LocationOption {
  locationId: string;
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";
}

export interface AnchorEventDetail {
  id: number;
  title: string;
  type: string;
  description: string | null;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  locationPool: string[];
  timeWindowPool: TimeWindowEntry[];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: string;
  browseTimeWindows: BrowseTimeWindowDetail[];
  createTimeWindows: CreateTimeWindowDetail[];
  exhausted: boolean;
  createdAt: string;
}

const trimNullable = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPRSummary = (pr: PartnerRequest): EventPRSummary => ({
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

const resolveTimeWindowSortTimestamp = (timeWindow: TimeWindowEntry): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(start).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const sortBrowseTimeWindows = (
  left: BrowseTimeWindowDetail,
  right: BrowseTimeWindowDetail,
): number => {
  const leftTimestamp = resolveTimeWindowSortTimestamp(left.timeWindow);
  const rightTimestamp = resolveTimeWindowSortTimestamp(right.timeWindow);
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return left.key.localeCompare(right.key);
};

const buildBrowseTimeWindowDetails = (
  prs: PartnerRequest[],
): BrowseTimeWindowDetail[] => {
  const byKey = new Map<string, BrowseTimeWindowDetail>();

  for (const pr of prs) {
    const key = buildTimeWindowKey(pr.time);
    const existing = byKey.get(key);
    if (existing) {
      existing.prs.push(toPRSummary(pr));
      continue;
    }

    byKey.set(key, {
      key,
      timeWindow: pr.time,
      prs: [toPRSummary(pr)],
    });
  }

  return Array.from(byKey.values()).sort(sortBrowseTimeWindows);
};

export async function getAnchorEventDetail(
  eventId: AnchorEventId,
): Promise<AnchorEventDetail> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const locationPool = normalizeLocationPool(event.locationPool);
  const timeWindowPool = listAnchorEventTimeWindows(event);
  const pois = await poiRepo.findByIds(locationPool);
  const poiByLocation = new Map(pois.map((poi) => [poi.id, poi]));

  const browsePRs = await readVisiblePartnerRequestsByType(event.type);
  const browseTimeWindows = buildBrowseTimeWindowDetails(browsePRs);
  const activePartnerCounts = await partnerRepo.countActiveByPrIds(
    browsePRs.map((pr) => pr.id),
  );

  for (const browseTimeWindow of browseTimeWindows) {
    for (const pr of browseTimeWindow.prs) {
      pr.partnerCount = activePartnerCounts.get(pr.id) ?? 0;
    }
  }

  const createTimeWindows: CreateTimeWindowDetail[] = [];
  let hasAvailableCapacity = false;

  for (const timeWindow of timeWindowPool) {
    const sameTypePRs = await readVisiblePartnerRequestsByTypeAndTime(
      event.type,
      timeWindow,
    );
    const activeCountsByLocation = new Map<string, number>();

    for (const pr of sameTypePRs) {
      if (!isActiveVisiblePRStatus(pr.status)) {
        continue;
      }

      const location = trimNullable(pr.location);
      if (!location) {
        continue;
      }
      if (!locationPool.includes(location)) {
        continue;
      }

      activeCountsByLocation.set(
        location,
        (activeCountsByLocation.get(location) ?? 0) + 1,
      );
    }

    const locationOptions: LocationOption[] = locationPool.map((locationId) => {
      const activeCount = activeCountsByLocation.get(locationId) ?? 0;
      const poi = poiByLocation.get(locationId) ?? null;
      const cap = poi?.perTimeWindowCap ?? null;
      const remainingQuota =
        cap === null ? null : Math.max(cap - activeCount, 0);
      const timeAvailable =
        !poi ||
        poi.availabilityRules.length === 0 ||
        isTimeWindowAvailableByPoiRules(poi.availabilityRules, timeWindow);
      const disabled =
        !timeAvailable || (remainingQuota !== null && remainingQuota <= 0);
      if (!disabled) {
        hasAvailableCapacity = true;
      }

      return {
        locationId,
        remainingQuota,
        disabled,
        disabledReason: !timeAvailable
          ? "TIME_UNAVAILABLE"
          : disabled
            ? "MAX_REACHED"
            : "NONE",
      };
    });

    createTimeWindows.push({
      key: buildTimeWindowKey(timeWindow),
      timeWindow,
      locationOptions,
    });
  }

  const exhausted =
    timeWindowPool.length === 0 || locationPool.length === 0 || !hasAvailableCapacity;

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    description: event.description,
    defaultMinPartners: event.defaultMinPartners ?? null,
    defaultMaxPartners: event.defaultMaxPartners ?? null,
    locationPool,
    timeWindowPool,
    coverImage: event.coverImage,
    betaGroupQrCode: event.betaGroupQrCode,
    status: event.status,
    browseTimeWindows,
    createTimeWindows,
    exhausted,
    createdAt: event.createdAt.toISOString(),
  };
}
