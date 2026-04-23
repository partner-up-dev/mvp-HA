import type { PRId } from "../../../entities/partner-request";

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
  sourceBatchId: number | null;
  sourceTimeWindow: [string | null, string | null];
  sourceLocation: string | null;
  recommendations: AlternativeBatchRecommendation[];
}

export async function recommendAlternativeBatches(
  sourcePrId: PRId,
): Promise<AlternativeBatchRecommendationResult> {
  return {
    sourcePrId,
    sourceBatchId: null,
    sourceTimeWindow: [null, null],
    sourceLocation: null,
    recommendations: [],
  };
}
