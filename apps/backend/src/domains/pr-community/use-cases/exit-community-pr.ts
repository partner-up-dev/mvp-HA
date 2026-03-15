import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { exitPRByUserId, type PublicPR } from "../../pr-core";

export async function exitCommunityPR(
  id: PRId,
  userId: UserId,
): Promise<PublicPR> {
  return exitPRByUserId(id, userId);
}
