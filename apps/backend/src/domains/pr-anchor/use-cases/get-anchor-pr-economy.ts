import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";

const prRepo = new PartnerRequestRepository();
const anchorPRRepo = new AnchorPRRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export type AnchorPREconomy = {
  prId: number;
  status: PRStatus;
  anchorEventId: number;
  batchId: number;
  economyPreview: {
    resourceBookingDeadlineAt: string | null;
    paymentModelApplied: "A" | "C" | null;
    discountRateApplied: number | null;
    subsidyCapApplied: number | null;
    cancellationPolicyApplied: string | null;
    economicPolicyScopeApplied: "EVENT_DEFAULT" | "BATCH_OVERRIDE" | null;
    economicPolicyVersionApplied: number | null;
  };
};

export async function getAnchorPREconomy(id: PRId): Promise<AnchorPREconomy> {
  const root = await prRepo.findById(id);
  if (!root || root.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const anchor = await anchorPRRepo.findByPrId(id);
  if (!anchor) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  return {
    prId: id,
    status: root.status,
    anchorEventId: anchor.anchorEventId,
    batchId: anchor.batchId,
    economyPreview: {
      resourceBookingDeadlineAt: toIsoString(anchor.resourceBookingDeadlineAt),
      paymentModelApplied: anchor.paymentModelApplied,
      discountRateApplied: anchor.discountRateApplied,
      subsidyCapApplied: anchor.subsidyCapApplied,
      cancellationPolicyApplied: anchor.cancellationPolicyApplied,
      economicPolicyScopeApplied: anchor.economicPolicyScopeApplied,
      economicPolicyVersionApplied: anchor.economicPolicyVersionApplied,
    },
  };
}
