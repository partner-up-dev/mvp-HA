import type { PartnerRequestSummary } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { buildPartnerRequestSummaries } from "./get-pr-summaries";
import { readPartnerRequestsByIds } from "../services/pr-read.service";

const partnerRepo = new PartnerRepository();

export async function getMyJoinedPRs(
  userId: UserId,
): Promise<PartnerRequestSummary[]> {
  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const rows = await readPartnerRequestsByIds(uniquePrIds, {
    consistency: "strong",
  });
  return buildPartnerRequestSummaries(rows);
}
