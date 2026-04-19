import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { NotificationOpportunityRepository } from "../../../repositories/NotificationOpportunityRepository";
import { NotificationWaveRepository } from "../../../repositories/NotificationWaveRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import {
  buildPRMessageDedupeKey,
  PR_MESSAGE_NOTIFICATION_CHANNEL,
  PR_MESSAGE_NOTIFICATION_KIND,
  resolvePRMessageNotificationRunAt,
  type PRMessageNotificationScheduler,
} from "../model/pr-message-notification";
import { canNotifyForUnreadWave } from "../model/unread-wave";

const partnerRepo = new PartnerRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();
const opportunityRepo = new NotificationOpportunityRepository();
const waveRepo = new NotificationWaveRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();

type CreatePRMessageUnreadWaveNotificationOpportunitiesInput = {
  request: PartnerRequest;
  authorUserId: UserId;
  messageId: PRMessageId;
  messageCreatedAt: Date;
  sourceEventId?: string | null;
  isChannelConfigured: () => Promise<boolean>;
  scheduleNotification: PRMessageNotificationScheduler;
};

type CreatePRMessageUnreadWaveNotificationOpportunitiesResult = {
  candidateRecipientCount: number;
  opportunityCount: number;
  skippedCount: number;
};

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

const emitUnreadWaveOpened = async (input: {
  prId: PRId;
  recipientUserId: UserId;
  authorUserId: UserId;
  messageId: PRMessageId;
  sourceEventId: string | null;
  waveId: number | null;
}): Promise<void> => {
  const event = await eventBus.publish(
    "notification.wave_opened",
    "partner_request",
    String(input.prId),
    {
      notificationKind: PR_MESSAGE_NOTIFICATION_KIND,
      aggregateType: "partner_request",
      aggregateId: String(input.prId),
      recipientUserId: input.recipientUserId,
      waveKey: `${input.prId}:${input.recipientUserId}`,
      waveId: input.waveId,
      sourceEventId: input.sourceEventId,
      waveStartMessageId: input.messageId,
      waveStartAuthorUserId: input.authorUserId,
    },
  );
  await writeToOutbox(event);
};

const emitOpportunityCreated = async (input: {
  prId: PRId;
  recipientUserId: UserId;
  authorUserId: UserId;
  messageId: PRMessageId;
  runAt: Date;
  sourceEventId: string | null;
  opportunityId: number | null;
  dedupeKey: string;
}): Promise<void> => {
  const event = await eventBus.publish(
    "notification.opportunity_created",
    "partner_request",
    String(input.prId),
    {
      notificationKind: PR_MESSAGE_NOTIFICATION_KIND,
      lifecycleModel: "WAVE",
      aggregateType: "partner_request",
      aggregateId: String(input.prId),
      recipientUserId: input.recipientUserId,
      channel: PR_MESSAGE_NOTIFICATION_CHANNEL,
      runAtIso: input.runAt.toISOString(),
      dedupeKey: input.dedupeKey,
      opportunityId: input.opportunityId,
      sourceEventId: input.sourceEventId,
      payload: {
        prId: input.prId,
        recipientUserId: input.recipientUserId,
        waveStartAuthorUserId: input.authorUserId,
        waveStartMessageId: input.messageId,
      },
    },
  );
  await writeToOutbox(event);
};

export const createPRMessageUnreadWaveNotificationOpportunities = async ({
  request,
  authorUserId,
  messageId,
  messageCreatedAt,
  sourceEventId = null,
  isChannelConfigured,
  scheduleNotification,
}: CreatePRMessageUnreadWaveNotificationOpportunitiesInput): Promise<CreatePRMessageUnreadWaveNotificationOpportunitiesResult> => {
  const configured = await isChannelConfigured();
  if (!configured) {
    return {
      candidateRecipientCount: 0,
      opportunityCount: 0,
      skippedCount: 0,
    };
  }

  const recipientUserIds = await collectRecipientUserIds(request, authorUserId);
  if (recipientUserIds.length === 0) {
    return {
      candidateRecipientCount: 0,
      opportunityCount: 0,
      skippedCount: 0,
    };
  }

  const existingInboxStates = await inboxStateRepo.findByPrIdAndUserIds(
    request.id,
    recipientUserIds,
  );
  const inboxStateByUserId = new Map(
    existingInboxStates.map((state) => [state.userId, state]),
  );
  const runAt = resolvePRMessageNotificationRunAt(messageCreatedAt);

  let opportunityCount = 0;
  let skippedCount = 0;

  for (const recipientUserId of recipientUserIds) {
    try {
      const notificationOpt =
        await userNotificationOptRepo.findByUserId(recipientUserId);
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        notificationOpt,
        PR_MESSAGE_NOTIFICATION_KIND,
      );
      if (!snapshot.enabled) {
        skippedCount += 1;
        continue;
      }

      const inboxState = inboxStateByUserId.get(recipientUserId) ?? null;
      if (!canNotifyForUnreadWave(inboxState)) {
        skippedCount += 1;
        continue;
      }

      await inboxStateRepo.upsertLastNotifiedMessageId(
        request.id,
        recipientUserId,
        messageId,
      );
      const waveKey = `${request.id}:${recipientUserId}`;
      const wave = await waveRepo.createOnce({
        waveStartEventId: sourceEventId,
        notificationKind: PR_MESSAGE_NOTIFICATION_KIND,
        aggregateType: "partner_request",
        aggregateId: String(request.id),
        recipientUserId,
        waveKey,
        waveStartMessageId: messageId,
        status: "OPEN",
        openedAt: messageCreatedAt,
      });
      await emitUnreadWaveOpened({
        prId: request.id,
        recipientUserId,
        authorUserId,
        messageId,
        sourceEventId,
        waveId: wave?.id ?? null,
      });
      const dedupeKey = buildPRMessageDedupeKey(
        recipientUserId,
        request.id,
        messageId,
      );
      const opportunityPayload = {
        prId: request.id,
        recipientUserId,
        waveStartAuthorUserId: authorUserId,
        waveStartMessageId: messageId,
      };
      const opportunity = await opportunityRepo.createOnce({
        eventId: sourceEventId,
        jobId: null,
        notificationKind: PR_MESSAGE_NOTIFICATION_KIND,
        lifecycleModel: "WAVE",
        aggregateType: "partner_request",
        aggregateId: String(request.id),
        recipientUserId,
        channel: PR_MESSAGE_NOTIFICATION_CHANNEL,
        status: "CREATED",
        runAt,
        dedupeKey,
        payload: opportunityPayload,
      });
      await emitOpportunityCreated({
        prId: request.id,
        recipientUserId,
        authorUserId,
        messageId,
        runAt,
        sourceEventId,
        opportunityId: opportunity?.id ?? null,
        dedupeKey,
      });
      const scheduleResult = await scheduleNotification({
        request,
        recipientUserId,
        authorUserId,
        waveStartMessageId: messageId,
        firstUnreadMessageCreatedAt: messageCreatedAt,
      });
      await opportunityRepo.markScheduledByDedupeKey(
        dedupeKey,
        scheduleResult?.jobId ?? null,
      );
      opportunityCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.error("[Notification] failed to create PR message opportunity", {
        prId: request.id,
        recipientUserId,
        messageId,
        error,
      });
    }
  }

  return {
    candidateRecipientCount: recipientUserIds.length,
    opportunityCount,
    skippedCount,
  };
};
