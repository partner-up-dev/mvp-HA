import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnchorEventRecommendationMatch,
  isAnchorEventMatchedRecommendation,
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
    candidateMinPartners: 3,
    activePartnerCount: 1,
    ...overrides,
  });

test("isAnchorEventMatchedRecommendation accepts exact location and start within tolerance without preference conflict", () => {
  const match = buildMatch({
    candidateTimeWindow: [
      "2026-04-27T11:35:00.000Z",
      "2026-04-27T12:35:00.000Z",
    ],
  });

  assert.equal(match.exactLocation, true);
  assert.equal(match.startDeltaMinutes, 5);
  assert.equal(match.startWithinTolerance, true);
  assert.equal(isAnchorEventMatchedRecommendation(match), true);
});

test("isAnchorEventMatchedRecommendation rejects different location", () => {
  const match = buildMatch({
    candidateLocationId: "court-b",
  });

  assert.equal(match.exactLocation, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("isAnchorEventMatchedRecommendation rejects start outside tolerance", () => {
  const match = buildMatch({
    candidateTimeWindow: [
      "2026-04-27T11:36:00.000Z",
      "2026-04-27T12:36:00.000Z",
    ],
  });

  assert.equal(match.startDeltaMinutes, 6);
  assert.equal(match.startWithinTolerance, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("isAnchorEventMatchedRecommendation rejects same-category preference conflict", () => {
  const match = buildMatch({
    candidatePreferences: ["球风:防守"],
  });

  assert.deepEqual(match.conflictingTagMatches, ["球风:防守"]);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("buildAnchorEventRecommendationMatch gives higher score to stronger group momentum", () => {
  const lowMomentum = buildMatch({
    candidateMinPartners: 4,
    activePartnerCount: 0,
  });
  const highMomentum = buildMatch({
    candidateMinPartners: 3,
    activePartnerCount: 2,
  });

  assert.equal(lowMomentum.groupMomentumScore, 0);
  assert.equal(highMomentum.groupMomentumScore, 2);
  assert.ok(highMomentum.score > lowMomentum.score);
});
