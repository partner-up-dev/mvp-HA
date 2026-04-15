import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities";
import type { UserId } from "../../../entities/user";
import { prMessageBodySchema } from "../../../entities/pr-message";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { createPersistedPRMessage } from "../../pr-core/use-cases/create-pr-message";

const prRepo = new PartnerRequestRepository();

export async function createAdminAnchorPRMessage(input: {
  prId: PRId;
  body: string;
  actorUserId: UserId;
}) {
  const request = await prRepo.findById(input.prId);
  if (!request || request.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const body = prMessageBodySchema.parse(input.body);

  return createPersistedPRMessage({
    request,
    prId: input.prId,
    authorUserId: input.actorUserId,
    body,
    actorUserId: input.actorUserId,
    action: "pr.create_system_message",
    markAuthorRead: false,
  });
}
