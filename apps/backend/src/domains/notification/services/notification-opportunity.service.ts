import type { UserId } from "../../../entities/user";
import type {
  NotificationChannel,
  NotificationLifecycleModel,
} from "../../../entities/notification-opportunity";
import type { NotificationOpportunityRow } from "../../../entities/notification-opportunity";
import { NotificationOpportunityRepository } from "../../../repositories/NotificationOpportunityRepository";
import type { NotificationKind } from "../model/notification-kind";

const opportunityRepo = new NotificationOpportunityRepository();

export type CreateNotificationOpportunityInput = {
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

  return opportunity;
};

export const markNotificationOpportunityScheduled = async (
  dedupeKey: string,
  jobId: number | null,
): Promise<NotificationOpportunityRow | null> =>
  opportunityRepo.markScheduledByDedupeKey(dedupeKey, jobId);
