import { HTTPException } from "hono/http-exception";
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
    throw new HTTPException(404, { message: "PR message not found" });
  }

  const deletedMessage = await messageRepo.deleteById(input.messageId);
  if (!deletedMessage) {
    throw new HTTPException(500, { message: "Failed to delete PR message" });
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
