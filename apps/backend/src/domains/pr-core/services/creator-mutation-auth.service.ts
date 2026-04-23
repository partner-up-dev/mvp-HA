import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { RequestAuth } from "../../../auth/types";
import { issueAuthForUser } from "../../../auth/middleware";
import { verifyUserPin } from "../../user";

const prRepo = new PartnerRequestRepository();
const userRepo = new UserRepository();

export type CreatorMutationMode = "status" | "content";

export type CreatorMutationAuthResult = {
  request: NonNullable<Awaited<ReturnType<PartnerRequestRepository["findById"]>>>;
  actorUserId: UserId | null;
  upgradedAuth: RequestAuth | null;
};

export async function authorizeCreatorMutation(
  prId: PRId,
  auth: RequestAuth,
  mode: CreatorMutationMode,
  pin?: string,
): Promise<CreatorMutationAuthResult> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  if (!request.createdBy) {
    if (mode === "content" && request.status === "DRAFT") {
      return {
        request,
        actorUserId: null,
        upgradedAuth: null,
      };
    }

    throw new HTTPException(403, {
      message: "Partner request has no claimed creator",
    });
  }

  if (auth.role !== "anonymous") {
    if (auth.userId !== request.createdBy) {
      throw new HTTPException(403, {
        message: "Only the creator can modify this partner request",
      });
    }

    return {
      request,
      actorUserId: request.createdBy,
      upgradedAuth: null,
    };
  }

  if (!pin) {
    throw new HTTPException(400, {
      message: "PIN required for anonymous creator mutation",
    });
  }

  const creator = await userRepo.findById(request.createdBy);
  if (!creator || !(await verifyUserPin(creator, pin))) {
    throw new HTTPException(403, { message: "Invalid PIN" });
  }

  const upgradedAuth = issueAuthForUser(creator);
  return {
    request,
    actorUserId: creator.id,
    upgradedAuth,
  };
}
