import { HTTPException } from "hono/http-exception";
import type { AnchorEvent, TimeWindowEntry } from "../../../entities";
import {
  deriveAnchorEventPreferenceTagCategory,
  normalizeAnchorEventPreferenceTagLabel,
} from "./preference-tags";

const MINUTE_MS = 60 * 1000;
const MATCHED_START_TOLERANCE_MINUTES = 5;
const DEFAULT_MIN_PARTNERS = 2;
const EXACT_LOCATION_SCORE = 2;
const LOCATION_MISMATCH_SCORE = -2;
const MATCHED_TIME_SCORE = 2;
const NEAR_TIME_MISMATCH_SCORE = -1;
const FAR_TIME_MISMATCH_SCORE = -2;
const MISSING_TIME_SCORE = -3;
const EXACT_TAG_SCORE_CAP = 2;
const CONFLICTING_TAG_PENALTY_CAP = 4;
const CONFLICTING_TAG_PENALTY = 2;

const parseTimestamp = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveDurationMinutes = (event: AnchorEvent): number => {
  const durationMinutes = event.timePoolConfig.durationMinutes;
  if (durationMinutes === null) {
    throw new HTTPException(409, {
      message: "Anchor event duration is not configured",
    });
  }
  return durationMinutes;
};

export const buildAnchorEventFormModeTimeWindow = (
  event: AnchorEvent,
  startAtIso: string,
  now: Date = new Date(),
): TimeWindowEntry => {
  const startAt = parseTimestamp(startAtIso);
  if (!startAt) {
    throw new HTTPException(400, { message: "Invalid startAt" });
  }

  const durationMinutes = resolveDurationMinutes(event);
  const endAt = new Date(startAt.getTime() + durationMinutes * MINUTE_MS);
  if (endAt.getTime() <= now.getTime()) {
    throw new HTTPException(400, {
      message: "Selected start time has already passed",
    });
  }

  const earliestLeadMinutes = event.timePoolConfig.earliestLeadMinutes;
  if (
    earliestLeadMinutes !== null &&
    endAt.getTime() > now.getTime() + earliestLeadMinutes * MINUTE_MS
  ) {
    throw new HTTPException(400, {
      message: "Selected start time is outside the event lead-time boundary",
    });
  }

  return [startAt.toISOString(), endAt.toISOString()];
};

const normalizePreferenceLabels = (preferences: readonly string[]): string[] => {
  const unique = new Map<string, string>();
  for (const preference of preferences) {
    const normalized = normalizeAnchorEventPreferenceTagLabel(preference);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLocaleLowerCase("zh-CN");
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }
  return Array.from(unique.values());
};

const buildExactMatchKeySet = (preferences: readonly string[]): Set<string> =>
  new Set(
    normalizePreferenceLabels(preferences).map((preference) =>
      preference.toLocaleLowerCase("zh-CN"),
    ),
  );

const buildCategoryMap = (preferences: readonly string[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const preference of normalizePreferenceLabels(preferences)) {
    const category = deriveAnchorEventPreferenceTagCategory(preference);
    if (!category) {
      continue;
    }
    map.set(category.toLocaleLowerCase("zh-CN"), preference);
  }
  return map;
};

export type AnchorEventRecommendationMatch = {
  exactLocation: boolean;
  startDeltaMinutes: number | null;
  startWithinTolerance: boolean;
  exactTagMatches: string[];
  conflictingTagMatches: string[];
  groupMomentumScore: number;
  score: number;
};

export const isAnchorEventMatchedRecommendation = (
  match: AnchorEventRecommendationMatch,
): boolean =>
  match.exactLocation &&
  match.startWithinTolerance &&
  match.conflictingTagMatches.length === 0;

const buildStartTimeScore = (startDeltaMinutes: number | null): number => {
  if (startDeltaMinutes === null) {
    return MISSING_TIME_SCORE;
  }
  if (startDeltaMinutes <= MATCHED_START_TOLERANCE_MINUTES) {
    return MATCHED_TIME_SCORE;
  }
  if (startDeltaMinutes <= 30) {
    return NEAR_TIME_MISMATCH_SCORE;
  }
  return FAR_TIME_MISMATCH_SCORE;
};

const buildGroupMomentumScore = (input: {
  candidateMinPartners: number | null;
  activePartnerCount: number;
}): number => {
  const minPartners =
    input.candidateMinPartners !== null &&
    input.candidateMinPartners >= DEFAULT_MIN_PARTNERS
      ? input.candidateMinPartners
      : DEFAULT_MIN_PARTNERS;
  const activePartnerCount = Math.max(0, input.activePartnerCount);
  const missingAfterCurrentUserJoins = Math.max(
    0,
    minPartners - (activePartnerCount + 1),
  );

  if (missingAfterCurrentUserJoins === 0) {
    return 2;
  }
  if (missingAfterCurrentUserJoins === 1) {
    return 1;
  }
  return 0;
};

export const buildAnchorEventRecommendationMatch = (input: {
  requestedLocationId: string;
  requestedStartAtIso: string;
  requestedPreferences: string[];
  candidateLocationId: string | null;
  candidateTimeWindow: TimeWindowEntry;
  candidatePreferences: string[];
  candidateMinPartners: number | null;
  activePartnerCount: number;
}): AnchorEventRecommendationMatch => {
  const requestedStart = parseTimestamp(input.requestedStartAtIso);
  const candidateStart = parseTimestamp(input.candidateTimeWindow[0] ?? "");
  const startDeltaMinutes =
    requestedStart && candidateStart
      ? Math.round(
          Math.abs(candidateStart.getTime() - requestedStart.getTime()) / MINUTE_MS,
        )
      : null;

  const exactRequestedPreferences = buildExactMatchKeySet(
    input.requestedPreferences,
  );
  const requestedCategoryMap = buildCategoryMap(input.requestedPreferences);
  const candidatePreferences = normalizePreferenceLabels(input.candidatePreferences);

  const exactTagMatches: string[] = [];
  const conflictingTagMatches: string[] = [];

  for (const candidatePreference of candidatePreferences) {
    const candidateKey = candidatePreference.toLocaleLowerCase("zh-CN");
    if (exactRequestedPreferences.has(candidateKey)) {
      exactTagMatches.push(candidatePreference);
      continue;
    }

    const category = deriveAnchorEventPreferenceTagCategory(candidatePreference);
    if (!category) {
      continue;
    }

    if (requestedCategoryMap.has(category.toLocaleLowerCase("zh-CN"))) {
      conflictingTagMatches.push(candidatePreference);
    }
  }

  const exactLocation =
    (input.candidateLocationId?.trim() ?? "") === input.requestedLocationId.trim();

  const startWithinTolerance =
    startDeltaMinutes !== null &&
    startDeltaMinutes <= MATCHED_START_TOLERANCE_MINUTES;
  const locationScore = exactLocation ? EXACT_LOCATION_SCORE : LOCATION_MISMATCH_SCORE;
  const timeScore = buildStartTimeScore(startDeltaMinutes);
  const preferenceScore =
    Math.min(exactTagMatches.length, EXACT_TAG_SCORE_CAP) -
    Math.min(
      conflictingTagMatches.length * CONFLICTING_TAG_PENALTY,
      CONFLICTING_TAG_PENALTY_CAP,
    );
  const groupMomentumScore = buildGroupMomentumScore({
    candidateMinPartners: input.candidateMinPartners,
    activePartnerCount: input.activePartnerCount,
  });
  const score = locationScore + timeScore + preferenceScore + groupMomentumScore;

  return {
    exactLocation,
    startDeltaMinutes,
    startWithinTolerance,
    exactTagMatches,
    conflictingTagMatches,
    groupMomentumScore,
    score,
  };
};
