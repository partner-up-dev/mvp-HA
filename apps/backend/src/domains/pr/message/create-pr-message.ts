import { HTTPException } from "hono/http-exception";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import { prMessageBodySchema } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../../pr-core/services/pr-message-access.service";
import {
  PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES,
  PR_MESSAGE_RATE_LIMIT_WINDOW_MS,
  buildPRMessageThreadState,
  toPRMessageThreadItem,
} from "../../pr-core/services/pr-message-thread.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function createPRMessage(input: {
  prId: PRId;
  authorUserId: UserId;
  body: string;
}) {
  const { request } = await requirePRMessageParticipantAccess(
    input.prId,
    input.authorUserId,
  );
  const body = prMessageBodySchema.parse(input.body);

  const recentMessageCount = await messageRepo.countByAuthorSince(
    input.prId,
    input.authorUserId,
    new Date(Date.now() - PR_MESSAGE_RATE_LIMIT_WINDOW_MS),
  );
  if (recentMessageCount >= PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES) {
    throw new HTTPException(429, {
      message: "Too many messages sent in a short time",
    });
  }

  return createPersistedPRMessage({
    request,
    prId: input.prId,
    authorUserId: input.authorUserId,
    body,
    actorUserId: input.authorUserId,
    action: "pr.create_message",
    markAuthorRead: true,
  });
}

export async function createPersistedPRMessage(input: {
  request: PartnerRequest;
  prId: PRId;
  authorUserId: UserId;
  body: string;
  actorUserId: UserId | null;
  action: string;
  markAuthorRead: boolean;
}) {
  const createdMessage = await messageRepo.create({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body: input.body,
  });
  if (!createdMessage) {
    throw new HTTPException(500, {
      message: "Failed to create PR message",
    });
  }

  const [createdMessageWithAuthor, actorInboxState] = await Promise.all([
    messageRepo.findWithAuthorById(createdMessage.id),
    input.markAuthorRead && input.authorUserId
      ? inboxStateRepo.upsertLastReadMessageId(
          input.prId,
          input.authorUserId,
          createdMessage.id,
        )
      : Promise.resolve(null),
  ]);
  if (!createdMessageWithAuthor) {
    throw new HTTPException(500, {
      message: "Failed to reload created PR message",
    });
  }

  const event = await eventBus.publish(
    "pr.message_created",
    "partner_request",
    String(input.prId),
    {
      prId: input.prId,
      messageId: createdMessage.id,
      authorUserId: input.authorUserId,
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: input.actorUserId,
    action: input.action,
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      messageId: createdMessage.id,
    },
  });

  return {
    message: toPRMessageThreadItem(createdMessageWithAuthor),
    thread: buildPRMessageThreadState(createdMessage.id, actorInboxState),
  };
}
