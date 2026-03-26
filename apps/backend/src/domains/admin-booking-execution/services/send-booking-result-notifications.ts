import type { PRId } from "../../../entities";
import type { UserId } from "../../../entities/user";
import { env } from "../../../lib/env";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
  type SendBookingResultNotificationParams,
} from "../../../services/WeChatSubscriptionMessageService";

const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

export type BookingResultNotificationSummary = {
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
};

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

const buildParams = (input: {
  prId: PRId;
  prTitle: string;
  resourceTitle: string;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
  openId: string;
}): SendBookingResultNotificationParams => ({
  openId: input.openId,
  activityTitle: input.prTitle,
  resourceTitle: input.resourceTitle,
  resultLabel: input.result === "SUCCESS" ? "预订成功" : "预订失败",
  remark:
    input.reason?.trim() ||
    (input.result === "SUCCESS"
      ? "平台已完成预订，请留意后续安排"
      : "平台暂未完成预订，请留意后续安排"),
  page: resolvePrUrl(input.prId),
});

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

export async function sendBookingResultNotifications(input: {
  prId: PRId;
  prTitle: string;
  resourceTitle: string;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
}): Promise<BookingResultNotificationSummary> {
  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(input.prId);
  const recipientUserIds = Array.from(
    new Set(activeParticipants.map((participant) => participant.userId)),
  );

  const summary: BookingResultNotificationSummary = {
    targetCount: recipientUserIds.length,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
  };

  if (recipientUserIds.length === 0) {
    return summary;
  }

  const configured = await subscriptionMessageService.isBookingResultConfigured();
  if (!configured) {
    summary.failureCount = recipientUserIds.length;
    return summary;
  }

  for (const recipientUserId of recipientUserIds) {
    const user = await userRepo.findById(recipientUserId as UserId);
    if (!user || user.status !== "ACTIVE" || !user.openId) {
      summary.skippedCount += 1;
      continue;
    }

    const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
    const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
      notificationOpt,
      "BOOKING_RESULT",
    );
    if (!snapshot.enabled) {
      summary.skippedCount += 1;
      continue;
    }

    try {
      await subscriptionMessageService.sendBookingResultNotification(
        buildParams({
          prId: input.prId,
          prTitle: input.prTitle,
          resourceTitle: input.resourceTitle,
          result: input.result,
          reason: input.reason,
          openId: user.openId,
        }),
      );
      summary.successCount += 1;
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
    }
  }

  return summary;
}
