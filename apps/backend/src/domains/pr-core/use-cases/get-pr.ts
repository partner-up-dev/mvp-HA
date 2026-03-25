import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { readPartnerRequestById } from "../services/pr-read.service";

export async function getPR(
  id: PRId,
  viewerOpenId?: string | null,
): Promise<PublicPR> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const viewerUserId = viewerOpenId
    ? (await resolveUserByOpenId(viewerOpenId)).id
    : null;

  return toPublicPR(request, viewerUserId);
}
