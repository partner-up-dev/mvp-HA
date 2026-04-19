import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import type { DomainEventType } from "../../../infra/events";
import {
  createPRMessageUnreadWaveNotificationOpportunities,
} from "../services/pr-message-unread-wave.service";
import type {
  PRMessageNotificationScheduler,
} from "../model/pr-message-notification";

const prRepo = new PartnerRequestRepository();
const messageRepo = new PRMessageRepository();

export type NotificationDomainEventInput = {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export type NotificationDomainEventDeps = {
  isPRMessageChannelConfigured: () => Promise<boolean>;
  schedulePRMessageNotification: PRMessageNotificationScheduler;
};

const handlePRMessageCreated = async (
  event: NotificationDomainEventInput,
  deps: NotificationDomainEventDeps,
): Promise<void> => {
  const prId = event.payload.prId;
  const messageId = event.payload.messageId;
  const authorUserId = event.payload.authorUserId;
  if (
    typeof prId !== "number" ||
    typeof messageId !== "number" ||
    typeof authorUserId !== "string"
  ) {
    throw new Error("Invalid pr.message_created payload");
  }

  const [request, message] = await Promise.all([
    prRepo.findById(prId),
    messageRepo.findByPrIdAndId(prId, messageId),
  ]);
  if (!request || !message) {
    console.warn("[Notification] pr.message_created target missing", {
      prId,
      messageId,
    });
    return;
  }

  await createPRMessageUnreadWaveNotificationOpportunities({
    request,
    authorUserId,
    messageId,
    messageCreatedAt: message.createdAt,
    sourceEventId: event.id,
    isChannelConfigured: deps.isPRMessageChannelConfigured,
    scheduleNotification: deps.schedulePRMessageNotification,
  });
};

export const handleNotificationDomainEvent = async (
  event: NotificationDomainEventInput,
  deps: NotificationDomainEventDeps,
): Promise<void> => {
  if ((event.type as DomainEventType | string) === "pr.message_created") {
    await handlePRMessageCreated(event, deps);
  }
};
