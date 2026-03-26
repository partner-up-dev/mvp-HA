import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type { AnchorPRRecord } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { joinPR } from "../../pr-core";
import type {
  AnchorEventId,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import { readVisibleAnchorPRRecordsByBatchIdAndLocation } from "../../pr-core/services/pr-read.service";

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

const normalizePreferenceFingerprint = (
  value: string | null,
): string | null => {
  if (value === null) return null;
  const trimmed = value
    .trim()
    .toLowerCase()
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("|");
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePreferencesFingerprint = (values: string[]): string | null => {
  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .sort()
    .join("|");

  return normalized.length > 0 ? normalized : null;
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

const isJoinableStatus = (status: string): boolean =>
  status === "OPEN" || status === "READY";

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
  record: AnchorPRRecord;
  activePartnerCount: number;
};

const sortCandidates = (
  left: CandidateWithStats,
  right: CandidateWithStats,
): number => {
  const leftScore = resolveOccupancyScore(
    left.activePartnerCount,
    left.record.root.maxPartners,
  );
  const rightScore = resolveOccupancyScore(
    right.activePartnerCount,
    right.record.root.maxPartners,
  );

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return (
    left.record.root.createdAt.getTime() - right.record.root.createdAt.getTime()
  );
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
    preferenceFingerprint,
  );

  const records =
    await readVisibleAnchorPRRecordsByBatchIdAndLocation(
      batchId,
      normalizedLocation,
    );

  const matchedByEvent = records.filter(
    (record) => record.anchor.anchorEventId === event.id,
  );

  const matchedByPreference = matchedByEvent.filter((record) => {
    if (!normalizedFingerprint) return true;

    const preferencesFingerprint = normalizePreferencesFingerprint(
      Array.isArray(record.root.preferences) ? record.root.preferences : [],
    );
    return preferencesFingerprint === normalizedFingerprint;
  });

  const joinableByStatus = matchedByPreference.filter((record) =>
    isJoinableStatus(record.root.status),
  );

  if (joinableByStatus.length === 0) {
    throw createNoJoinableCandidateError();
  }

  const candidates = await Promise.all(
    joinableByStatus.map(async (record) => ({
      record,
      activePartnerCount: await partnerRepo.countActiveByPrId(record.root.id),
    })),
  );

  candidates.sort(sortCandidates);

  let lastRetryableError: HTTPException | null = null;

  for (const candidate of candidates) {
    try {
      await joinPR(candidate.record.root.id, openId);
      return {
        selectedPrId: candidate.record.root.id,
        canonicalPath: `/apr/${candidate.record.root.id}`,
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
