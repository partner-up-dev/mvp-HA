import { z } from "zod";
import type {
  PRBookingExecution,
  PRBookingExecutionResult,
  PRId,
} from "../../../entities";
import { userIdSchema, type User, type UserId } from "../../../entities/user";
import { env } from "../../../lib/env";
import { PRBookingExecutionRepository } from "../../../repositories/PRBookingExecutionRepository";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { BOOKING_RESULT_NOTIFICATION_KIND } from "../model/notification-kind";

const bookingExecutionRepo = new PRBookingExecutionRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const BOOKING_RESULT_DEDUPE_PREFIX = "wechat-booking-result";

export const bookingResultNotificationJobPayloadSchema = z.object({
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

export type BookingResultNotificationJobPayload = z.infer<
  typeof bookingResultNotificationJobPayloadSchema
>;

export type BookingResultNotificationSummary = {
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
};

type BookingResultDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    bookingItem: string;
    statusLabel: string;
    activityTime: string;
    address: string;
    bookingDetail: string;
    page: string | null;
  };
};

type BookingResultDispatchBlocked = {
  status: "SKIPPED";
  errorCode: string;
  errorMessage: string;
};

export type BookingResultDispatchPreparation =
  | BookingResultDispatchReady
  | BookingResultDispatchBlocked;

export const buildBookingResultDedupeKey = (
  executionId: PRBookingExecution["id"],
): string => `${BOOKING_RESULT_DEDUPE_PREFIX}:${executionId}`;

export const createBookingResultNotificationSummary = (
  targetCount: number,
): BookingResultNotificationSummary => ({
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

export const prepareBookingResultNotificationDispatch = async (input: {
  payload: BookingResultNotificationJobPayload;
  userId: UserId;
}): Promise<BookingResultDispatchPreparation> => {
  const user = await userRepo.findById(input.userId);
  if (!user || user.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    };
  }

  if (!user.openId) {
    return {
      status: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "User has no bound WeChat openId",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    BOOKING_RESULT_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "BOOKING_RESULT_OPT_OUT",
      errorMessage: "User disabled booking result notifications",
    };
  }

  return {
    status: "READY",
    recipient: {
      ...user,
      openId: user.openId,
    },
    message: {
      bookingItem: input.payload.bookingItem,
      statusLabel: input.payload.statusLabel,
      activityTime: input.payload.activityTime,
      address: input.payload.address,
      bookingDetail: input.payload.bookingDetail,
      page: resolvePrUrl(input.payload.prId),
    },
  };
};

export const persistBookingResultNotificationSummary = async (
  executionId: PRBookingExecution["id"],
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

export const recordBookingResultNotificationDelivery = async (input: {
  jobId: number;
  payload: BookingResultNotificationJobPayload;
  userId: UserId;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.userId,
    notificationKind: BOOKING_RESULT_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeBookingResultNotificationCredit = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    BOOKING_RESULT_NOTIFICATION_KIND,
  );
};

export const clearBookingResultNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    BOOKING_RESULT_NOTIFICATION_KIND,
  );
};

export const resolveBookingResultStatusLabel = (
  result: PRBookingExecutionResult,
): string => (result === "SUCCESS" ? "预订成功" : "预订失败");

