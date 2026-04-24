import type { PRBookingExecution, PRId } from "../../entities";
import type { UserId } from "../../entities/user";
import {
  BOOKING_RESULT_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  bookingResultNotificationJobPayloadSchema,
  buildBookingResultDedupeKey,
  clearBookingResultNotificationCredits,
  consumeBookingResultNotificationCredit,
  createBookingResultNotificationSummary,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  persistBookingResultNotificationSummary,
  prepareBookingResultNotificationDispatch,
  recordBookingResultNotificationDelivery,
  resolveBookingResultStatusLabel,
  type BookingResultNotificationSummary,
} from "../../domains/notification";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { bookingResultSchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_BOOKING_RESULT_JOB_TYPE = "wechat.notification.booking-result";

let bookingResultHandlerRegistered = false;

async function handleBookingResultJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = bookingResultNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid booking result notification job payload");
  }
  const payload = parseResult.data;

  const recipientUserIds = Array.from(new Set(payload.recipientUserIds));
  const summary = createBookingResultNotificationSummary(recipientUserIds.length);

  if (recipientUserIds.length === 0) {
    await persistBookingResultNotificationSummary(payload.executionId, summary);
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    BOOKING_RESULT_NOTIFICATION_KIND,
  );
  if (!configured) {
    summary.failureCount = recipientUserIds.length;
    for (const userId of recipientUserIds) {
      await recordBookingResultNotificationDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "FAILED",
        errorCode: "BOOKING_RESULT_CHANNEL_NOT_CONFIGURED",
        errorMessage: "Booking result subscription message channel is not configured",
      });
    }
    await persistBookingResultNotificationSummary(payload.executionId, summary);
    return;
  }

  for (const userId of recipientUserIds) {
    const prepared = await prepareBookingResultNotificationDispatch({
      payload,
      userId,
    });

    if (prepared.status !== "READY") {
      summary.skippedCount += 1;
      await recordBookingResultNotificationDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: prepared.status,
        errorCode: prepared.errorCode,
        errorMessage: prepared.errorMessage,
      });
      continue;
    }

    const sendResult = await sendWeChatSubscriptionNotification({
      kind: BOOKING_RESULT_NOTIFICATION_KIND,
      openId: prepared.recipient.openId,
      bookingItem: prepared.message.bookingItem,
      statusLabel: prepared.message.statusLabel,
      activityTime: prepared.message.activityTime,
      address: prepared.message.address,
      bookingDetail: prepared.message.bookingDetail,
      page: prepared.message.page,
    });

    if (sendResult.status === "SENT") {
      summary.successCount += 1;
      await recordBookingResultNotificationDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "SUCCESS",
      });
      await consumeBookingResultNotificationCredit(prepared.recipient.id);
      continue;
    }

    if (isRecipientPermissionRevoked(sendResult)) {
      await clearBookingResultNotificationCredits(prepared.recipient.id);
    }

    summary.failureCount += 1;
    await recordBookingResultNotificationDelivery({
      jobId: context.jobId,
      payload,
      userId,
      result: "FAILED",
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });
  }

  await persistBookingResultNotificationSummary(payload.executionId, summary);
}

export function registerWeChatBookingResultJobs(): void {
  if (bookingResultHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(
    WECHAT_BOOKING_RESULT_JOB_TYPE,
    handleBookingResultJob,
  );
  bookingResultHandlerRegistered = true;
}

export async function scheduleWeChatBookingResultNotifications(input: {
  executionId: PRBookingExecution["id"];
  prId: PRId;
  recipientUserIds: UserId[];
  bookingItem: string;
  statusLabel: string;
  activityTime: string;
  address: string;
  bookingDetail: string;
}): Promise<BookingResultNotificationSummary> {
  const scheduledAt = new Date();
  const recipientUserIds = Array.from(new Set(input.recipientUserIds));
  const summary = createBookingResultNotificationSummary(recipientUserIds.length);
  const jobDedupeKey = buildBookingResultDedupeKey(input.executionId);

  const scheduleResult = await jobRunner.scheduleOnce({
    jobType: WECHAT_BOOKING_RESULT_JOB_TYPE,
    runAt: scheduledAt,
    ...bookingResultSchedulePolicy,
    dedupeKey: jobDedupeKey,
    payload: {
      executionId: input.executionId,
      prId: input.prId,
      recipientUserIds,
      bookingItem: input.bookingItem,
      statusLabel: input.statusLabel,
      activityTime: input.activityTime,
      address: input.address,
      bookingDetail: input.bookingDetail,
      scheduledAtIso: scheduledAt.toISOString(),
    },
  });

  for (const recipientUserId of recipientUserIds) {
    const opportunityDedupeKey = `${jobDedupeKey}:${recipientUserId}`;
    await createNotificationOpportunity({
      notificationKind: BOOKING_RESULT_NOTIFICATION_KIND,
      lifecycleModel: "ONE_SHOT",
      aggregateType: "partner_request",
      aggregateId: String(input.prId),
      recipientUserId,
      channel: WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
      runAt: scheduledAt,
      dedupeKey: opportunityDedupeKey,
      payload: {
        executionId: input.executionId,
        prId: input.prId,
        recipientUserId,
      },
    });
    await markNotificationOpportunityScheduled(
      opportunityDedupeKey,
      scheduleResult.jobId,
    );
  }

  return summary;
}

export { resolveBookingResultStatusLabel };
export type { BookingResultNotificationSummary };
