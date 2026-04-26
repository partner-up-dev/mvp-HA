import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import type { AnchorEventId, PRStatus } from "../../../entities";
import { isEventScopedLocation } from "../services/event-scope";
import {
  buildAnchorEventFormModeTimeWindow,
  buildAnchorEventRecommendationMatch,
  isAnchorEventPrimaryRecommendationMatch,
} from "../services/form-mode";

const anchorEventRepo = new AnchorEventRepository();
const eventContextRepo = new AnchorEventPRContextRepository();
const partnerRepo = new PartnerRepository();

const RECOMMENDABLE_PR_STATUSES = new Set<PRStatus>(["OPEN", "READY"]);
const MAX_ORDERED_CANDIDATE_COUNT = 6;

export interface AnchorEventFormModeRecommendationResponse {
  event: {
    id: number;
    title: string;
  };
  selection: {
    locationId: string;
    timeWindow: [string, string];
    preferences: string[];
  };
  primaryRecommendation: FormModeRecommendationCandidate | null;
  orderedCandidates: FormModeRecommendationCandidate[];
}

export interface FormModeRecommendationCandidate {
  pr: {
    id: number;
    title: string | null;
    type: string;
    location: string | null;
    time: [string | null, string | null];
    status: PRStatus;
    minPartners: number | null;
    maxPartners: number | null;
    preferences: string[];
    notes: string | null;
    partnerCount: number;
    createdAt: string;
  };
  match: {
    exactLocation: boolean;
    startDeltaMinutes: number | null;
    exactTagMatches: string[];
    conflictingTagMatches: string[];
    score: number;
  };
}

export async function recommendAnchorEventFormModePRs(input: {
  eventId: AnchorEventId;
  locationId: string;
  startAt: string;
  preferences: string[];
}): Promise<AnchorEventFormModeRecommendationResponse> {
  const event = await anchorEventRepo.findById(input.eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const locationId = input.locationId.trim();
  if (!isEventScopedLocation(event, locationId)) {
    throw new HTTPException(400, {
      message: "Selected location is outside the anchor event scope",
    });
  }

  const selectionTimeWindow = buildAnchorEventFormModeTimeWindow(
    event,
    input.startAt,
  );
  const selectionPreferences = Array.from(
    new Set(input.preferences.map((preference) => preference.trim()).filter(Boolean)),
  );

  const candidateRecords = (await eventContextRepo.findVisibleByAnchorEventId(event.id))
    .filter((record) => RECOMMENDABLE_PR_STATUSES.has(record.root.status))
    .filter((record) => record.root.id !== undefined);

  const activePartnerCounts = await partnerRepo.countActiveByPrIds(
    candidateRecords.map((record) => record.root.id),
  );

  const rankedCandidates = candidateRecords
    .map<FormModeRecommendationCandidate>((record) => {
      const match = buildAnchorEventRecommendationMatch({
        requestedLocationId: locationId,
        requestedStartAtIso: selectionTimeWindow[0]!,
        requestedPreferences: selectionPreferences,
        candidateLocationId: record.root.location,
        candidateTimeWindow: record.root.time,
        candidatePreferences: record.root.preferences,
        activePartnerCount: activePartnerCounts.get(record.root.id) ?? 0,
      });

      return {
        pr: {
          id: record.root.id,
          title: record.root.title,
          type: record.root.type,
          location: record.root.location,
          time: record.root.time,
          status: record.root.status,
          minPartners: record.root.minPartners,
          maxPartners: record.root.maxPartners,
          preferences: [...record.root.preferences],
          notes: record.root.notes,
          partnerCount: activePartnerCounts.get(record.root.id) ?? 0,
          createdAt: record.root.createdAt.toISOString(),
        },
        match,
      };
    })
    .sort((left, right) => {
      if (right.match.score !== left.match.score) {
        return right.match.score - left.match.score;
      }

      const leftDelta = left.match.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      const rightDelta = right.match.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      if (leftDelta !== rightDelta) {
        return leftDelta - rightDelta;
      }

      return right.pr.createdAt.localeCompare(left.pr.createdAt);
    });

  const primaryRecommendation =
    rankedCandidates.find((candidate) =>
      isAnchorEventPrimaryRecommendationMatch(candidate.match),
    ) ?? null;
  const orderedCandidates = rankedCandidates
    .filter((candidate) => candidate.pr.id !== primaryRecommendation?.pr.id)
    .slice(0, MAX_ORDERED_CANDIDATE_COUNT);

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    selection: {
      locationId,
      timeWindow: selectionTimeWindow as [string, string],
      preferences: selectionPreferences,
    },
    primaryRecommendation,
    orderedCandidates,
  };
}
