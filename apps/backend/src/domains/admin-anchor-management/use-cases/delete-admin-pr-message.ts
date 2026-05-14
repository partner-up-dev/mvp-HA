import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities";
import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";

const messageRepo = new PRMessageRepository();

export async function deleteAdminPRMessage(input: {
  prId: PRId;
  messageId: PRMessageId;
  actorUserId: UserId | null;
}) {
  const message = await messageRepo.findByPrIdAndId(input.prId, input.messageId);
  if (!message) {
    return throwHttpProblem({ status: 404, detail: "PR message not found" });
  }

  const deletedMessage = await messageRepo.deleteById(input.messageId);
  if (!deletedMessage) {
    return throwHttpProblem({ status: 500, detail: "Failed to delete PR message" });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete_message",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      messageId: input.messageId,
    },
  });

  return {
    ok: true as const,
    messageId: input.messageId,
  };
}
