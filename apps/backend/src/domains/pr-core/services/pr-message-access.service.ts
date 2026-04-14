import { HTTPException } from "hono/http-exception";
import type { Partner } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type PRMessageParticipantAccess = {
  request: PartnerRequest;
  participant: Partner;
};

export async function requirePRMessageParticipantAccess(
  prId: PRId,
  userId: UserId,
): Promise<PRMessageParticipantAccess> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const participant = await partnerRepo.findActiveByPrIdAndUserId(prId, userId);
  if (!participant) {
    throw new HTTPException(403, {
      message: "Only current active participants can access PR messages",
    });
  }

  return {
    request,
    participant,
  };
}
