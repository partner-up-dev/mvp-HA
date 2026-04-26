import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnchorEventRecommendationMatch,
  isAnchorEventPrimaryRecommendationMatch,
} from "./form-mode";

const requestedStartAt = "2026-04-27T11:30:00.000Z";
const requestedLocationId = "court-a";

const buildMatch = (
  overrides: Partial<Parameters<typeof buildAnchorEventRecommendationMatch>[0]> = {},
) =>
  buildAnchorEventRecommendationMatch({
    requestedLocationId,
    requestedStartAtIso: requestedStartAt,
    requestedPreferences: ["球风:进攻"],
    candidateLocationId: requestedLocationId,
    candidateTimeWindow: [requestedStartAt, "2026-04-27T12:30:00.000Z"],
    candidatePreferences: ["球风:进攻"],
    activePartnerCount: 1,
    ...overrides,
  });

test("isAnchorEventPrimaryRecommendationMatch accepts exact location and start without preference conflict", () => {
  const match = buildMatch();

  assert.equal(match.exactLocation, true);
  assert.equal(match.startDeltaMinutes, 0);
  assert.equal(isAnchorEventPrimaryRecommendationMatch(match), true);
});

test("isAnchorEventPrimaryRecommendationMatch rejects different location", () => {
  const match = buildMatch({
    candidateLocationId: "court-b",
  });

  assert.equal(match.exactLocation, false);
  assert.equal(isAnchorEventPrimaryRecommendationMatch(match), false);
});

test("isAnchorEventPrimaryRecommendationMatch rejects different start time", () => {
  const match = buildMatch({
    candidateTimeWindow: [
      "2026-04-27T12:00:00.000Z",
      "2026-04-27T13:00:00.000Z",
    ],
  });

  assert.equal(match.startDeltaMinutes, 30);
  assert.equal(isAnchorEventPrimaryRecommendationMatch(match), false);
});

test("isAnchorEventPrimaryRecommendationMatch rejects same-category preference conflict", () => {
  const match = buildMatch({
    candidatePreferences: ["球风:防守"],
  });

  assert.deepEqual(match.conflictingTagMatches, ["球风:防守"]);
  assert.equal(isAnchorEventPrimaryRecommendationMatch(match), false);
});
