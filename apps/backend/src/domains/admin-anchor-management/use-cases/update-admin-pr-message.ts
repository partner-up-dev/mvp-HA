import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities";
import { prMessageBodySchema, type PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { toPRMessageThreadItem } from "../../pr-core/services/pr-message-thread.service";

const messageRepo = new PRMessageRepository();

export async function updateAdminPRMessage(input: {
  prId: PRId;
  messageId: PRMessageId;
  body: string;
  actorUserId: UserId | null;
}) {
  const message = await messageRepo.findByPrIdAndId(input.prId, input.messageId);
  if (!message) {
    throw new HTTPException(404, { message: "PR message not found" });
  }

  const body = prMessageBodySchema.parse(input.body);
  const updatedMessage = await messageRepo.updateBody(input.messageId, body);
  if (!updatedMessage) {
    throw new HTTPException(500, { message: "Failed to update PR message" });
  }

  const updatedWithAuthor = await messageRepo.findWithAuthorById(updatedMessage.id);
  if (!updatedWithAuthor) {
    throw new HTTPException(500, {
      message: "Failed to reload updated PR message",
    });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_update_message",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      messageId: input.messageId,
    },
  });

  return {
    message: {
      ...toPRMessageThreadItem(updatedWithAuthor),
      updatedAt: updatedWithAuthor.updatedAt.toISOString(),
    },
  };
}
