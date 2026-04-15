import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type { AnchorPRRecord } from "../../../repositories/AnchorPRRepository";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import type { TimeWindowEntry } from "../../../entities/anchor-event";
import { readVisibleAnchorPRRecordsByBatchId } from "../../pr-core/services/pr-read.service";
import { isJoinableStatus } from "../../pr-core/services/status-rules";

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

export const buildDemandCardKey = (
  batchId: number,
  displayLocationName: string,
  preferenceFingerprint: string | null,
): string => {
  const locationSegment = normalizeCardKeySegment(displayLocationName);
  const preferenceSegment = preferenceFingerprint
    ? normalizeCardKeySegment(preferenceFingerprint)
    : "_";
  return `${batchId}::${locationSegment}::${preferenceSegment}`;
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
  batchId: number;
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
  batchId: AnchorEventBatchId;
  timeWindow: TimeWindowEntry;
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  candidates: DemandCardCandidate[];
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

const toDemandCardCandidate = (record: AnchorPRRecord): DemandCardCandidate => ({
  prId: record.root.id,
  status: record.root.status,
  createdAt: record.root.createdAt.toISOString(),
  notes: trimNullable(record.root.notes),
});

const buildCandidateGroup = ({
  batchId,
  timeWindow,
  displayLocationName,
  preferenceFingerprint,
  preferenceTags,
}: {
  batchId: AnchorEventBatchId;
  timeWindow: TimeWindowEntry;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
}): CandidateGroup => ({
  cardKey: buildDemandCardKey(
    batchId,
    displayLocationName,
    preferenceFingerprint,
  ),
  batchId,
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
  const batches = await batchRepo.findByAnchorEventId(eventId);
  const nonExpiredBatches = batches.filter((batch) => batch.status !== "EXPIRED");
  const groupMap = new Map<string, CandidateGroup>();

  for (const batch of nonExpiredBatches) {
    const records = await readVisibleAnchorPRRecordsByBatchId(batch.id);
    for (const record of records) {
      if (!isJoinableStatus(record.root.status)) {
        continue;
      }

      if (record.anchor.anchorEventId !== eventId) {
        continue;
      }

      const displayLocationName = trimNullable(record.root.location);
      if (!displayLocationName) {
        continue;
      }

      const preferences = Array.isArray(record.root.preferences)
        ? record.root.preferences
        : [];
      const preferenceTags = resolvePreferenceTags(preferences);
      const preferenceFingerprint = normalizePreferenceFingerprint(preferenceTags);
      const cardKey = buildDemandCardKey(
        batch.id,
        displayLocationName,
        preferenceFingerprint,
      );

      const existing =
        groupMap.get(cardKey) ??
        buildCandidateGroup({
          batchId: batch.id,
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
    batchId: group.batchId,
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
