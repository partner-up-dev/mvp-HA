import { HTTPException } from "hono/http-exception";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import {
  prMessageBodySchema,
  type PRMessageId,
} from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { scheduleWeChatPRMessageNotification } from "../../../infra/notifications";
import { operationLogService } from "../../../infra/operation-log";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { WeChatSubscriptionMessageService } from "../../../services/WeChatSubscriptionMessageService";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import {
  PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES,
  PR_MESSAGE_RATE_LIMIT_WINDOW_MS,
  buildPRMessageThreadState,
  canNotifyForUnreadWave,
  toPRMessageThreadItem,
} from "../services/pr-message-thread.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();
const partnerRepo = new PartnerRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

const collectRecipientUserIds = async (
  request: PartnerRequest,
  authorUserId: UserId,
): Promise<UserId[]> => {
  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(request.id);

  return Array.from(
    new Set(
      activeParticipants
        .map((participant) => participant.userId)
        .filter(
          (userId): userId is UserId =>
            userId !== null && userId !== authorUserId,
        ),
    ),
  );
};

const scheduleNotificationsBestEffort = async (input: {
  request: PartnerRequest;
  authorUserId: UserId;
  messageId: PRMessageId;
  messageCreatedAt: Date;
}): Promise<void> => {
  const configured = await subscriptionMessageService.isPRMessageConfigured();
  if (!configured) {
    return;
  }

  const recipientUserIds = await collectRecipientUserIds(
    input.request,
    input.authorUserId,
  );
  if (recipientUserIds.length === 0) {
    return;
  }

  const existingInboxStates = await inboxStateRepo.findByPrIdAndUserIds(
    input.request.id,
    recipientUserIds,
  );
  const inboxStateByUserId = new Map(
    existingInboxStates.map((state) => [state.userId, state]),
  );

  for (const recipientUserId of recipientUserIds) {
    try {
      const notificationOpt =
        await userNotificationOptRepo.findByUserId(recipientUserId);
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        notificationOpt,
        "PR_MESSAGE",
      );
      if (!snapshot.enabled) {
        continue;
      }

      const inboxState = inboxStateByUserId.get(recipientUserId) ?? null;
      if (!canNotifyForUnreadWave(inboxState)) {
        continue;
      }

      await inboxStateRepo.upsertLastNotifiedMessageId(
        input.request.id,
        recipientUserId,
        input.messageId,
      );
      await scheduleWeChatPRMessageNotification({
        request: input.request,
        recipientUserId,
        authorUserId: input.authorUserId,
        waveStartMessageId: input.messageId,
        firstUnreadMessageCreatedAt: input.messageCreatedAt,
      });
    } catch (error) {
      console.error("[PRMessage] failed to schedule notification", {
        prId: input.request.id,
        recipientUserId,
        messageId: input.messageId,
        error,
      });
    }
  }
};

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

  void scheduleNotificationsBestEffort({
    request: input.request,
    authorUserId: input.authorUserId,
    messageId: createdMessage.id,
    messageCreatedAt: createdMessage.createdAt,
  });

  return {
    message: toPRMessageThreadItem(createdMessageWithAuthor),
    thread: buildPRMessageThreadState(createdMessage.id, actorInboxState),
  };
}
