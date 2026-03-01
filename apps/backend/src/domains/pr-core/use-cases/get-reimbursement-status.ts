import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { refreshTemporalStatus } from "../temporal-refresh";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

type ReimbursementReason =
  | "MODEL_NOT_REIMBURSEMENT"
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
  openId: string,
): Promise<ReimbursementStatusView> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (refreshedRequest.paymentModelApplied !== "A") {
    return {
      eligible: false,
      canRequest: false,
      requested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reason: "MODEL_NOT_REIMBURSEMENT",
    };
  }

  if (refreshedRequest.status !== "CLOSED") {
    return {
      eligible: false,
      canRequest: false,
      requested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reason: "PR_NOT_CLOSED",
    };
  }

  const user = await resolveUserByOpenId(openId);
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot || slot.status !== "ATTENDED") {
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
