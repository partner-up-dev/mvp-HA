import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
import type { PartnerRequest } from "../../../entities/partner-request";
import { readVisiblePartnerRequestsByTypeAndTime } from "../../pr-core/services/pr-read.service";
import { isJoinableStatus } from "../../pr-core/services/status-rules";

const eventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

const trimNullable = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePreferenceTag = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeFingerprintPart = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCardKeySegment = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const buildTimeWindowKey = (timeWindow: TimeWindowEntry): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

export const buildDemandCardKey = (
  timeWindow: TimeWindowEntry,
  displayLocationName: string,
  preferenceFingerprint: string | null,
): string => {
  const timeWindowSegment = buildTimeWindowKey(timeWindow);
  const locationSegment = normalizeCardKeySegment(displayLocationName);
  const preferenceSegment = preferenceFingerprint
    ? normalizeCardKeySegment(preferenceFingerprint)
    : "_";
  return `${timeWindowSegment}::${locationSegment}::${preferenceSegment}`;
};

export const normalizePreferenceFingerprint = (
  values: string[],
): string | null => {
  const normalized = values
    .map((value) => normalizeFingerprintPart(value))
    .filter((value): value is string => value !== null)
    .sort()
    .join("|");

  return normalized.length > 0 ? normalized : null;
};

export const resolvePreferenceTags = (values: string[]): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = normalizePreferenceTag(value);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
};

export const resolveDemandCardBatchStartTimestamp = (
  timeWindow: TimeWindowEntry,
): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(start).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export type DemandCardCandidate = {
  prId: number;
  status: string;
  createdAt: string;
  notes: string | null;
};

export type DemandCardSummary = {
  cardKey: string;
  timeWindow: TimeWindowEntry;
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  candidateCount: number;
};

type CandidateGroup = {
  cardKey: string;
  timeWindow: TimeWindowEntry;
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  candidates: DemandCardCandidate[];
};

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

const compareCandidates = (
  left: DemandCardCandidate,
  right: DemandCardCandidate,
): number => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
  const safeRight = Number.isFinite(rightTime)
    ? rightTime
    : Number.POSITIVE_INFINITY;

  if (safeLeft !== safeRight) {
    return safeLeft - safeRight;
  }

  return left.prId - right.prId;
};

const compareCards = (left: DemandCardSummary, right: DemandCardSummary): number => {
  if (left.batchStartTimestamp !== right.batchStartTimestamp) {
    return left.batchStartTimestamp - right.batchStartTimestamp;
  }

  return left.cardKey.localeCompare(right.cardKey);
};

const toDemandCardCandidate = (record: PartnerRequest): DemandCardCandidate => ({
  prId: record.id,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  notes: trimNullable(record.notes),
});

const buildCandidateGroup = ({
  timeWindow,
  displayLocationName,
  preferenceFingerprint,
  preferenceTags,
}: {
  timeWindow: TimeWindowEntry;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
}): CandidateGroup => ({
  cardKey: buildDemandCardKey(
    timeWindow,
    displayLocationName,
    preferenceFingerprint,
  ),
  timeWindow,
  batchStartTimestamp: resolveDemandCardBatchStartTimestamp(timeWindow),
  displayLocationName,
  preferenceFingerprint,
  preferenceTags,
  candidates: [],
});

const groupJoinableCandidates = async (
  eventId: AnchorEventId,
): Promise<CandidateGroup[]> => {
  const [event, batches] = await Promise.all([
    eventRepo.findById(eventId),
    batchRepo.findByAnchorEventId(eventId),
  ]);

  if (!event) {
    return [];
  }

  const nonExpiredBatches = batches.filter((batch) => batch.status !== "EXPIRED");
  const groupMap = new Map<string, CandidateGroup>();

  for (const batch of nonExpiredBatches) {
    const records = (
      await readVisiblePartnerRequestsByTypeAndTime(event.type, batch.timeWindow)
    ).filter((record) => isEventScopedLocation(event, record.location));

    for (const record of records) {
      if (!isJoinableStatus(record.status)) {
        continue;
      }

      const displayLocationName = trimNullable(record.location);
      if (!displayLocationName) {
        continue;
      }

      const preferences = Array.isArray(record.preferences)
        ? record.preferences
        : [];
      const preferenceTags = resolvePreferenceTags(preferences);
      const preferenceFingerprint = normalizePreferenceFingerprint(preferenceTags);
      const cardKey = buildDemandCardKey(
        batch.timeWindow,
        displayLocationName,
        preferenceFingerprint,
      );

      const existing =
        groupMap.get(cardKey) ??
        buildCandidateGroup({
          timeWindow: batch.timeWindow,
          displayLocationName,
          preferenceFingerprint,
          preferenceTags,
        });

      existing.candidates.push(toDemandCardCandidate(record));
      groupMap.set(cardKey, existing);
    }
  }

  return Array.from(groupMap.values());
};

const materializeDemandCardSummary = (
  group: CandidateGroup,
): DemandCardSummary | null => {
  const sortedCandidates = [...group.candidates].sort(compareCandidates);
  if (sortedCandidates.length === 0) {
    return null;
  }

  const representativeCandidate =
    sortedCandidates.find((candidate) => candidate.notes !== null) ??
    sortedCandidates[0] ??
    null;

  return {
    cardKey: group.cardKey,
    timeWindow: group.timeWindow,
    batchStartTimestamp: group.batchStartTimestamp,
    displayLocationName: group.displayLocationName,
    preferenceFingerprint: group.preferenceFingerprint,
    preferenceTags: group.preferenceTags,
    notes: representativeCandidate?.notes ?? null,
    detailPrId: representativeCandidate?.prId ?? null,
    candidateCount: sortedCandidates.length,
  };
};

export const listDemandCards = async (
  eventId: AnchorEventId,
): Promise<DemandCardSummary[]> => {
  const groups = await groupJoinableCandidates(eventId);
  return groups
    .map(materializeDemandCardSummary)
    .filter((card): card is DemandCardSummary => card !== null)
    .sort(compareCards);
};

export const listJoinableDemandCardCandidates = async ({
  eventId,
  cardKey,
}: {
  eventId: AnchorEventId;
  cardKey: string;
}): Promise<DemandCardCandidate[]> => {
  const groups = await groupJoinableCandidates(eventId);
  const matched = groups.find((group) => group.cardKey === cardKey);
  if (!matched) {
    return [];
  }

  return [...matched.candidates].sort(compareCandidates);
};
