import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities";
import type { UserId } from "../../../entities/user";
import { prMessageBodySchema } from "../../../entities/pr-message";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { createPersistedPRMessage } from "../../pr/message/create-pr-message";

const prRepo = new PartnerRequestRepository();

export async function createAdminPRMessage(input: {
  prId: PRId;
  body: string;
  actorUserId: UserId;
}) {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
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
