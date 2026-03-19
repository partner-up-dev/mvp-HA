import type { PartnerRequestSummary } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { buildPartnerRequestSummaries } from "./get-pr-summaries";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

export async function getMyJoinedPRs(
  userId: UserId,
): Promise<PartnerRequestSummary[]> {
  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const rows = await prRepo.findByIds(uniquePrIds);
  return buildPartnerRequestSummaries(rows);
}
