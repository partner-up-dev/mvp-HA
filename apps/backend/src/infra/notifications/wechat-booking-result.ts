import { z } from "zod";
import type {
  AnchorPRBookingExecution,
  AnchorPRBookingExecutionResult,
  PRId,
} from "../../entities";
import { userIdSchema, type UserId } from "../../entities/user";
import { env } from "../../lib/env";
import { AnchorPRBookingExecutionRepository } from "../../repositories/AnchorPRBookingExecutionRepository";
import { NotificationDeliveryRepository } from "../../repositories/NotificationDeliveryRepository";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../repositories/UserRepository";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../services/WeChatSubscriptionMessageService";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { bookingResultSchedulePolicy } from "./job-schedule-policy";

const WECHAT_BOOKING_RESULT_JOB_TYPE = "wechat.notification.booking-result";

const bookingResultJobPayloadSchema = z.object({
  executionId: z.coerce.number().int().positive(),
  prId: z.coerce.number().int().positive(),
  recipientUserIds: z.array(userIdSchema),
  bookingItem: z.string().trim().min(1),
  statusLabel: z.string().trim().min(1),
  activityTime: z.string().trim().min(1),
  address: z.string().trim().min(1),
  bookingDetail: z.string().trim().min(1),
  scheduledAtIso: z.string().datetime(),
});

type BookingResultJobPayload = z.infer<typeof bookingResultJobPayloadSchema>;

export type BookingResultNotificationSummary = {
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
};

const bookingExecutionRepo = new AnchorPRBookingExecutionRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

let bookingResultHandlerRegistered = false;

const buildBookingResultDedupeKey = (
  executionId: AnchorPRBookingExecution["id"],
): string => `wechat-booking-result:${executionId}`;

const createEmptySummary = (targetCount: number): BookingResultNotificationSummary => ({
  targetCount,
  successCount: 0,
  failureCount: 0,
  skippedCount: 0,
});

const resolvePrUrl = (prId: PRId): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;

  try {
    const url = new URL(frontendUrl);
    url.pathname = `/apr/${prId}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const classifyBookingResultError = (
  error: unknown,
): { code: string | null; message: string } => {
  if (error instanceof WeChatSubscriptionMessageError) {
    return {
      code: error.errorCode,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
    };
  }

  return {
    code: null,
    message: String(error),
  };
};

const persistSummary = async (
  executionId: AnchorPRBookingExecution["id"],
  summary: BookingResultNotificationSummary,
): Promise<void> => {
  const updated = await bookingExecutionRepo.updateNotificationSummary(
    executionId,
    summary,
  );
  if (!updated) {
    throw new Error("Booking execution record not found while updating summary");
  }
};

const recordDelivery = async (input: {
  jobId: number;
  payload: BookingResultJobPayload;
  userId: UserId;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.userId,
    notificationKind: "BOOKING_RESULT",
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

async function handleBookingResultJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = bookingResultJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid booking result notification job payload");
  }
  const payload = parseResult.data;

  const recipientUserIds = Array.from(new Set(payload.recipientUserIds));
  const summary = createEmptySummary(recipientUserIds.length);

  if (recipientUserIds.length === 0) {
    await persistSummary(payload.executionId, summary);
    return;
  }

  const configured = await subscriptionMessageService.isBookingResultConfigured();
  if (!configured) {
    summary.failureCount = recipientUserIds.length;
    for (const userId of recipientUserIds) {
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "FAILED",
        errorCode: "BOOKING_RESULT_CHANNEL_NOT_CONFIGURED",
        errorMessage: "Booking result subscription message channel is not configured",
      });
    }
    await persistSummary(payload.executionId, summary);
    return;
  }

  for (const userId of recipientUserIds) {
    const user = await userRepo.findById(userId);
    if (!user || user.status !== "ACTIVE") {
      summary.skippedCount += 1;
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "SKIPPED",
        errorCode: "USER_INACTIVE_OR_MISSING",
        errorMessage: "User is missing or not active",
      });
      continue;
    }

    if (!user.openId) {
      summary.skippedCount += 1;
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "SKIPPED",
        errorCode: "USER_OPENID_MISSING",
        errorMessage: "User has no bound WeChat openId",
      });
      continue;
    }

    const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
    const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
      notificationOpt,
      "BOOKING_RESULT",
    );
    if (!snapshot.enabled) {
      summary.skippedCount += 1;
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "SKIPPED",
        errorCode: "BOOKING_RESULT_OPT_OUT",
        errorMessage: "User disabled booking result notifications",
      });
      continue;
    }

    try {
      await subscriptionMessageService.sendBookingResultNotification({
        openId: user.openId,
        bookingItem: payload.bookingItem,
        statusLabel: payload.statusLabel,
        activityTime: payload.activityTime,
        address: payload.address,
        bookingDetail: payload.bookingDetail,
        page: resolvePrUrl(payload.prId),
      });
      summary.successCount += 1;
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "SUCCESS",
      });
      await userNotificationOptRepo.consumeOneWechatNotificationCredit(
        user.id,
        "BOOKING_RESULT",
      );
    } catch (error) {
      const classified = classifyBookingResultError(error);
      if (classified.code === "43101") {
        await userNotificationOptRepo.clearWechatNotificationCredits(
          user.id,
          "BOOKING_RESULT",
        );
      }

      summary.failureCount += 1;
      await recordDelivery({
        jobId: context.jobId,
        payload,
        userId,
        result: "FAILED",
        errorCode: classified.code,
        errorMessage: classified.message,
      });
    }
  }

  await persistSummary(payload.executionId, summary);
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
  executionId: AnchorPRBookingExecution["id"];
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
  const summary = createEmptySummary(recipientUserIds.length);

  await jobRunner.scheduleOnce({
    jobType: WECHAT_BOOKING_RESULT_JOB_TYPE,
    runAt: scheduledAt,
    ...bookingResultSchedulePolicy,
    dedupeKey: buildBookingResultDedupeKey(input.executionId),
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

  return summary;
}

export const resolveBookingResultStatusLabel = (
  result: AnchorPRBookingExecutionResult,
): string => (result === "SUCCESS" ? "预订成功" : "预订失败");
