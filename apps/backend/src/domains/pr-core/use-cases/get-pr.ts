import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";

const prRepo = new PartnerRequestRepository();

export async function getPR(
  id: PRId,
  viewerOpenId?: string | null,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const refreshed = await refreshTemporalStatus(request);
  const viewerUserId = viewerOpenId
    ? (await resolveUserByOpenId(viewerOpenId)).id
    : null;

  return toPublicPR(refreshed, viewerUserId);
}
