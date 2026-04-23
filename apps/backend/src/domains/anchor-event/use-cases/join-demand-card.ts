import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { joinPR } from "../../pr";
import type {
  AnchorEventId,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import type { PartnerRequest } from "../../../entities/partner-request";
import { readVisiblePartnerRequestsByTypeAndTime } from "../../pr/services";
import {
  buildDemandCardKey,
  listJoinableDemandCardCandidates,
  normalizePreferenceFingerprint,
} from "../services/demand-card-projection.service";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const partnerRepo = new PartnerRepository();

const NO_JOINABLE_CANDIDATE_CODE = "NO_JOINABLE_CANDIDATE";

type CodedHttpException = HTTPException & {
  code?: string;
};

export type JoinDemandCardInput = {
  eventId: AnchorEventId;
  cardKey: string;
  batchId: AnchorEventBatchId;
  displayLocationName: string;
  timeWindow: TimeWindowEntry;
  preferenceFingerprint: string | null;
  openId: string;
};

export type JoinDemandCardResult = {
  selectedPrId: number;
  canonicalPath: string;
  cardKey: string;
};

const trimNullable = (value: string | null): string | null => {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTimeWindow = (
  value: TimeWindowEntry,
): [string | null, string | null] => {
  return [trimNullable(value[0]), trimNullable(value[1])];
};

const resolveOccupancyScore = (
  activePartnerCount: number,
  maxPartners: number | null,
): number => {
  if (maxPartners === null || maxPartners <= 0) {
    return activePartnerCount;
  }
  return activePartnerCount / maxPartners;
};

const isRetryableCandidateError = (error: unknown): error is HTTPException => {
  if (!(error instanceof HTTPException)) {
    return false;
  }

  return error.status === 400 || error.status === 404;
};

const createNoJoinableCandidateError = (): HTTPException => {
  const error = new HTTPException(409, {
    message: "No joinable Anchor PR candidate for this demand card",
  }) as CodedHttpException;
  error.code = NO_JOINABLE_CANDIDATE_CODE;
  return error;
};

type CandidateWithStats = {
  record: PartnerRequest;
  activePartnerCount: number;
};

const sortCandidates = (
  left: CandidateWithStats,
  right: CandidateWithStats,
): number => {
  const leftScore = resolveOccupancyScore(
    left.activePartnerCount,
    left.record.maxPartners,
  );
  const rightScore = resolveOccupancyScore(
    right.activePartnerCount,
    right.record.maxPartners,
  );

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return left.record.createdAt.getTime() - right.record.createdAt.getTime();
};

export const joinDemandCard = async ({
  eventId,
  cardKey,
  batchId,
  displayLocationName,
  timeWindow,
  preferenceFingerprint,
  openId,
}: JoinDemandCardInput): Promise<JoinDemandCardResult> => {
  const normalizedLocation = displayLocationName.trim();
  if (!normalizedLocation) {
    throw new HTTPException(400, {
      message: "displayLocationName is required",
    });
  }

  const [event, batch] = await Promise.all([
    anchorEventRepo.findById(eventId),
    batchRepo.findById(batchId),
  ]);

  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  if (!batch || batch.anchorEventId !== event.id) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const requestWindow = normalizeTimeWindow(timeWindow);
  const batchWindow = normalizeTimeWindow(batch.timeWindow);
  if (
    requestWindow[0] !== batchWindow[0] ||
    requestWindow[1] !== batchWindow[1]
  ) {
    throw new HTTPException(400, {
      message: "Demand card time window does not match target batch",
    });
  }

  const normalizedFingerprint = normalizePreferenceFingerprint(
    preferenceFingerprint === null
      ? []
      : preferenceFingerprint
          .split("|")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
  );
  const normalizedCardKey = buildDemandCardKey(
    batch.timeWindow,
    normalizedLocation,
    normalizedFingerprint,
  );

  if (normalizedCardKey !== cardKey) {
    throw new HTTPException(400, {
      message: "Demand card identity does not match request payload",
    });
  }

  const joinableCandidates = await listJoinableDemandCardCandidates({
    eventId,
    cardKey,
  });

  if (joinableCandidates.length === 0) {
    throw createNoJoinableCandidateError();
  }

  const candidateIds = new Set(joinableCandidates.map((candidate) => candidate.prId));
  const records = await readVisiblePartnerRequestsByTypeAndTime(
    event.type,
    batch.timeWindow,
  );
  const matchedRecords = records.filter((record) => {
    if (!candidateIds.has(record.id)) {
      return false;
    }

    return (record.location?.trim() ?? "") === normalizedLocation;
  });

  const candidates = await Promise.all(
    matchedRecords.map(async (record) => ({
      record,
      activePartnerCount: await partnerRepo.countActiveByPrId(record.id),
    })),
  );

  candidates.sort(sortCandidates);

  let lastRetryableError: HTTPException | null = null;

  for (const candidate of candidates) {
    try {
      await joinPR(candidate.record.id, openId);
      return {
        selectedPrId: candidate.record.id,
        canonicalPath: `/pr/${candidate.record.id}`,
        cardKey,
      };
    } catch (error) {
      if (isRetryableCandidateError(error)) {
        lastRetryableError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastRetryableError) {
    throw createNoJoinableCandidateError();
  }

  throw createNoJoinableCandidateError();
};

export const demandCardJoinErrorCode = {
  NO_JOINABLE_CANDIDATE: NO_JOINABLE_CANDIDATE_CODE,
} as const;
