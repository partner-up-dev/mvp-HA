import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { getPRDetailView, type PRDetail } from "./get-pr-detail";

export type AnchorPRDetail = PRDetail;

export async function getAnchorPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<AnchorPRDetail> {
  return getPRDetailView(id, viewerIdentity);
}
