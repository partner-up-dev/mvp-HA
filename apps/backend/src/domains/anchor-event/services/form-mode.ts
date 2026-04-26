import { HTTPException } from "hono/http-exception";
import type { AnchorEvent, TimeWindowEntry } from "../../../entities";
import {
  deriveAnchorEventPreferenceTagCategory,
  normalizeAnchorEventPreferenceTagLabel,
} from "./preference-tags";

const MINUTE_MS = 60 * 1000;
const PRIMARY_RECOMMENDATION_MIN_SCORE = 320;

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
  exactTagMatches: string[];
  conflictingTagMatches: string[];
  score: number;
};

export const isAnchorEventPrimaryRecommendationMatch = (
  match: AnchorEventRecommendationMatch,
): boolean =>
  match.exactLocation &&
  match.startDeltaMinutes === 0 &&
  match.conflictingTagMatches.length === 0 &&
  match.score >= PRIMARY_RECOMMENDATION_MIN_SCORE;

export const buildAnchorEventRecommendationMatch = (input: {
  requestedLocationId: string;
  requestedStartAtIso: string;
  requestedPreferences: string[];
  candidateLocationId: string | null;
  candidateTimeWindow: TimeWindowEntry;
  candidatePreferences: string[];
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

  let score = 0;
  if (startDeltaMinutes !== null) {
    score += Math.max(0, 240 - Math.min(startDeltaMinutes, 240));
  }
  if (exactLocation) {
    score += 80;
  }
  score += exactTagMatches.length * 16;
  score -= conflictingTagMatches.length * 18;
  score += Math.min(input.activePartnerCount, 4) * 4;

  return {
    exactLocation,
    startDeltaMinutes,
    exactTagMatches,
    conflictingTagMatches,
    score,
  };
};
