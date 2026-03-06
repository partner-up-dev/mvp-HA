import type { PartnerRequestSummary } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { buildPartnerRequestSummaries } from "./get-pr-summaries";

const prRepo = new PartnerRequestRepository();

export async function getMyCreatedPRs(
  userId: UserId,
): Promise<PartnerRequestSummary[]> {
  const rows = await prRepo.findByCreatorId(userId);
  return buildPartnerRequestSummaries(rows);
}
