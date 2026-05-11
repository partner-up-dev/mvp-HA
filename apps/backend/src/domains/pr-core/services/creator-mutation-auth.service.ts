import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { RequestAuth } from "../../../auth/types";

const prRepo = new PartnerRequestRepository();

export type CreatorMutationMode = "status" | "content";

export type CreatorMutationAuthResult = {
  request: NonNullable<Awaited<ReturnType<PartnerRequestRepository["findById"]>>>;
  actorUserId: UserId | null;
};

export async function authorizeCreatorMutation(
  prId: PRId,
  auth: RequestAuth,
  mode: CreatorMutationMode,
): Promise<CreatorMutationAuthResult> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  if (mode === "content" && request.status === "DRAFT") {
    return {
      request,
      actorUserId: (auth.userId as UserId | null) ?? null,
    };
  }

  if (!request.createdBy) {
    throw new HTTPException(403, {
      message: "Partner request has no claimed creator",
    });
  }

  if (auth.role === "anonymous" || auth.userId !== request.createdBy) {
    throw new HTTPException(403, {
      message: "Only the creator can modify this partner request",
    });
  }

  return {
    request,
    actorUserId: request.createdBy,
  };
}
