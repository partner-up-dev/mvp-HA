import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { readPartnerRequestById } from "../services/pr-read.service";
import {
  getAnchorPRDetail,
  type AnchorPRDetail,
} from "../../pr-anchor/use-cases/get-anchor-pr";
import {
  getCommunityPRDetail,
  type CommunityPRDetail,
} from "../../pr-community/use-cases/get-community-pr";

export type PRDetail = AnchorPRDetail | CommunityPRDetail;

export async function getPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<PRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  if (request.prKind === "ANCHOR") {
    return await getAnchorPRDetail(id, viewerIdentity);
  }

  return await getCommunityPRDetail(id, viewerIdentity);
}
