import type { UserId } from "../../../entities/user";
import type {
  NotificationChannel,
  NotificationLifecycleModel,
} from "../../../entities/notification-opportunity";
import type { NotificationOpportunityRow } from "../../../entities/notification-opportunity";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { NotificationOpportunityRepository } from "../../../repositories/NotificationOpportunityRepository";
import type { NotificationKind } from "../model/notification-kind";

const opportunityRepo = new NotificationOpportunityRepository();

export type CreateNotificationOpportunityInput = {
  sourceEventId?: string | null;
  notificationKind: NotificationKind;
  lifecycleModel: NotificationLifecycleModel;
  aggregateType: string;
  aggregateId: string;
  recipientUserId: UserId;
  channel: NotificationChannel;
  runAt: Date;
  dedupeKey: string;
  payload: Record<string, unknown>;
};

export const createNotificationOpportunity = async (
  input: CreateNotificationOpportunityInput,
): Promise<NotificationOpportunityRow | null> => {
  const opportunity = await opportunityRepo.createOnce({
    eventId: input.sourceEventId ?? null,
    jobId: null,
    notificationKind: input.notificationKind,
    lifecycleModel: input.lifecycleModel,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    status: "CREATED",
    runAt: input.runAt,
    dedupeKey: input.dedupeKey,
    payload: input.payload,
  });

  const event = await eventBus.publish(
    "notification.opportunity_created",
    input.aggregateType,
    input.aggregateId,
    {
      notificationKind: input.notificationKind,
      lifecycleModel: input.lifecycleModel,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      recipientUserId: input.recipientUserId,
      channel: input.channel,
      runAtIso: input.runAt.toISOString(),
      dedupeKey: input.dedupeKey,
      opportunityId: opportunity?.id ?? null,
      sourceEventId: input.sourceEventId ?? null,
      payload: input.payload,
    },
  );
  await writeToOutbox(event);

  return opportunity;
};

export const markNotificationOpportunityScheduled = async (
  dedupeKey: string,
  jobId: number | null,
): Promise<NotificationOpportunityRow | null> =>
  opportunityRepo.markScheduledByDedupeKey(dedupeKey, jobId);

