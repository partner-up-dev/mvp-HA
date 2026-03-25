import { HTTPException } from "hono/http-exception";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { readPartnerRequestById } from "../services/pr-read.service";

const partnerRepo = new PartnerRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();

type ReimbursementReason =
  | "NO_POSTPAID_SUPPORT"
  | "PR_NOT_CLOSED"
  | "SLOT_NOT_ELIGIBLE"
  | "ALREADY_REQUESTED";

export interface ReimbursementStatusView {
  eligible: boolean;
  canRequest: boolean;
  requested: boolean;
  reimbursementStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  reimbursementAmount: number | null;
  reason: ReimbursementReason | null;
}

export async function getReimbursementStatus(
  id: PRId,
  userId: UserId,
): Promise<ReimbursementStatusView> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR") {
    throw new HTTPException(400, {
      message: "Reimbursement is only available for anchor PR",
    });
  }
  const supportRows = await prSupportRepo.findByPrId(id);
  const supportsPostpaidSettlement = supportRows.some(
    (row) => row.settlementMode === "PLATFORM_POSTPAID",
  );
  if (!supportsPostpaidSettlement) {
    return {
      eligible: false,
      canRequest: false,
      requested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reason: "NO_POSTPAID_SUPPORT",
    };
  }

  if (request.status !== "CLOSED") {
    return {
      eligible: false,
      canRequest: false,
      requested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reason: "PR_NOT_CLOSED",
    };
  }

  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, userId);
  if (!slot) {
    throw new HTTPException(403, {
      message: "Reimbursement status is only available to active participants",
    });
  }
  if (slot.status !== "ATTENDED") {
    return {
      eligible: false,
      canRequest: false,
      requested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reason: "SLOT_NOT_ELIGIBLE",
    };
  }

  const requested = slot.reimbursementRequested;
  const canRequest = !requested;

  return {
    eligible: true,
    canRequest,
    requested,
    reimbursementStatus: slot.reimbursementStatus,
    reimbursementAmount: slot.reimbursementAmount,
    reason: requested ? "ALREADY_REQUESTED" : null,
  };
}
