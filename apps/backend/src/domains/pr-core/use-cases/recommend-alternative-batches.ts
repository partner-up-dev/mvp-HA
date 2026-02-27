import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type { PRId } from "../../../entities/partner-request";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

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
  const source = await prRepo.findById(sourcePrId);
  if (!source) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (
    source.prKind !== "ANCHOR" ||
    source.anchorEventId === null ||
    source.batchId === null
  ) {
    throw new HTTPException(400, {
      message:
        "Alternative batch recommendation is only available for anchor PR",
    });
  }
  if (!source.location) {
    throw new HTTPException(400, {
      message: "Current anchor PR has no location",
    });
  }

  const event = await anchorEventRepo.findById(source.anchorEventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const sourceBatch = await batchRepo.findById(source.batchId);
  if (!sourceBatch) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const existingBatches = await batchRepo.findByAnchorEventId(
    source.anchorEventId,
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

    const prsAtSameLocation = await prRepo.findByBatchIdAndLocation(
      matchedBatch.id,
      source.location,
    );
    const joinable = prsAtSameLocation.find((pr) =>
      hasJoinableStatus(pr.status),
    );

    recommendations.push({
      batchId: matchedBatch.id,
      timeWindow,
      location: source.location,
      hasJoinablePr: !!joinable,
      joinablePrId: joinable?.id ?? null,
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
