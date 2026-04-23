import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { getPRDetailView, type PRDetail } from "./get-pr-detail";

export type CommunityPRDetail = PRDetail;

export async function getCommunityPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<CommunityPRDetail> {
  return getPRDetailView(id, viewerIdentity);
}
