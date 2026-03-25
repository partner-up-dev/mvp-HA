import type { PartnerRequestSummary } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { buildPartnerRequestSummaries } from "./get-pr-summaries";
import { readPartnerRequestsByCreatorId } from "../services/pr-read.service";

export async function getMyCreatedPRs(
  userId: UserId,
): Promise<PartnerRequestSummary[]> {
  const rows = await readPartnerRequestsByCreatorId(userId, {
    consistency: "strong",
  });
  return buildPartnerRequestSummaries(rows);
}
