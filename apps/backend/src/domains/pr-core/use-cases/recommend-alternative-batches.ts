import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import type { PRId } from "../../../entities/partner-request";
import {
  readPartnerRequestById,
  readVisibleAnchorPRRecordsByBatchIdAndLocation,
} from "../services/pr-read.service";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();

const windowsEqual = (
  a: [string | null, string | null],
  b: [string | null, string | null],
): boolean => a[0] === b[0] && a[1] === b[1];

const hasJoinableStatus = (status: string): boolean =>
  status === "OPEN" || status === "READY";

export interface AlternativeBatchRecommendation {
  batchId: number | null;
  timeWindow: [string | null, string | null];
  location: string;
  hasJoinablePr: boolean;
  joinablePrId: number | null;
  createOnAccept: boolean;
}

export interface AlternativeBatchRecommendationResult {
  sourcePrId: number;
  sourceBatchId: number;
  sourceTimeWindow: [string | null, string | null];
  sourceLocation: string;
  recommendations: AlternativeBatchRecommendation[];
}

export async function recommendAlternativeBatches(
  sourcePrId: PRId,
): Promise<AlternativeBatchRecommendationResult> {
  const sourceRequest = await readPartnerRequestById(sourcePrId, {
    consistency: "strong",
  });
  if (!sourceRequest) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (sourceRequest.prKind !== "ANCHOR") {
    throw new HTTPException(400, {
      message:
        "Alternative batch recommendation is only available for anchor PR",
    });
  }
  const sourceRecord = await anchorPRRepo.findRecordByPrId(sourcePrId);
  if (!sourceRecord) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const source = sourceRecord.root;
  const anchor = sourceRecord.anchor;
  if (!source.location) {
    throw new HTTPException(400, {
      message: "Current anchor PR has no location",
    });
  }

  const event = await anchorEventRepo.findById(anchor.anchorEventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const sourceBatch = await batchRepo.findById(anchor.batchId);
  if (!sourceBatch) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const existingBatches = await batchRepo.findByAnchorEventId(
    anchor.anchorEventId,
  );

  const recommendations: AlternativeBatchRecommendation[] = [];
  for (const timeWindow of event.timeWindowPool ?? []) {
    if (windowsEqual(timeWindow, sourceBatch.timeWindow)) continue;

    const matchedBatch = existingBatches.find((batch) =>
      windowsEqual(batch.timeWindow, timeWindow),
    );

    if (!matchedBatch) {
      recommendations.push({
        batchId: null,
        timeWindow,
        location: source.location,
        hasJoinablePr: false,
        joinablePrId: null,
        createOnAccept: true,
      });
      continue;
    }

    const prsAtSameLocation =
      await readVisibleAnchorPRRecordsByBatchIdAndLocation(
        matchedBatch.id,
        source.location,
      );
    const joinable = prsAtSameLocation.find((record) =>
      hasJoinableStatus(record.root.status),
    );

    recommendations.push({
      batchId: matchedBatch.id,
      timeWindow,
      location: source.location,
      hasJoinablePr: !!joinable,
      joinablePrId: joinable?.root.id ?? null,
      createOnAccept: !joinable,
    });
  }

  return {
    sourcePrId: source.id,
    sourceBatchId: sourceBatch.id,
    sourceTimeWindow: sourceBatch.timeWindow,
    sourceLocation: source.location,
    recommendations,
  };
}
