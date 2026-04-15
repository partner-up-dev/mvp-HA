import { z } from "zod";
import type { PartnerRequest, PRId } from "../../entities/partner-request";
import { userIdSchema, type UserId, type UserRole } from "../../entities/user";
import { env } from "../../lib/env";
import { PRMessageInboxStateRepository } from "../../repositories/PRMessageInboxStateRepository";
import { NotificationDeliveryRepository } from "../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../repositories/PRMessageRepository";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../repositories/UserRepository";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../services/WeChatSubscriptionMessageService";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { prMessageSchedulePolicy } from "./job-schedule-policy";

const WECHAT_PR_MESSAGE_JOB_TYPE = "wechat.notification.pr-message";
const PR_MESSAGE_DEDUPE_PREFIX = "wechat-pr-message";
export const PR_MESSAGE_DEBOUNCE_WINDOW_MS = 5 * 60 * 1_000;

const prMessageJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  waveStartAuthorUserId: userIdSchema,
  waveStartMessageId: z.coerce.number().int().positive(),
  firstUnreadMessageCreatedAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime(),
});

type PRMessageJobPayload = z.infer<typeof prMessageJobPayloadSchema>;

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();
const messageRepo = new PRMessageRepository();
const deliveryRepo = new NotificationDeliveryRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

let prMessageHandlerRegistered = false;

const buildPRMessageDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  waveStartMessageId: number,
): string =>
  `${PR_MESSAGE_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${waveStartMessageId}`;

const buildPRMessageDedupePrefixForUser = (userId: UserId): string =>
  `${PR_MESSAGE_DEDUPE_PREFIX}:${userId}:`;

const resolvePrUrl = (request: PartnerRequest): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;

  try {
    const url = new URL(frontendUrl);
    url.pathname =
      request.prKind === "ANCHOR" ? `/apr/${request.id}` : `/cpr/${request.id}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const resolveThreadTitle = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `PR#${request.id}`;

const resolveAuthorName = (
  nickname: string | null,
  role: UserRole | null,
): string => (role === "service" ? "系统消息" : nickname?.trim() || "搭子");

const formatUnreadMessageSummary = (messageCount: number): string =>
  `${Math.max(1, messageCount)}条留言，请尽快查看`;

export const resolvePRMessageNotificationRunAt = (
  firstUnreadMessageCreatedAt: Date,
): Date =>
  new Date(firstUnreadMessageCreatedAt.getTime() + PR_MESSAGE_DEBOUNCE_WINDOW_MS);

const formatMessageSentAt = (messageCreatedAtIso: string): string =>
  new Date(messageCreatedAtIso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const classifyPRMessageError = (
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

const recordDelivery = async (input: {
  jobId: number;
  payload: PRMessageJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: "PR_MESSAGE",
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

async function handlePRMessageJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = prMessageJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid PR message notification job payload");
  }
  const payload = parseResult.data;

  const recipient = await userRepo.findById(payload.recipientUserId);
  if (!recipient || recipient.status !== "ACTIVE") {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "Recipient is missing or not active",
    });
    return;
  }

  if (!recipient.openId) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "Recipient has no bound WeChat openId",
    });
    return;
  }

  const request = await prRepo.findById(payload.prId);
  if (!request) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "PR_MISSING",
      errorMessage: "Partner request not found",
    });
    return;
  }

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(
    payload.prId,
    payload.recipientUserId,
  );
  if (!stillParticipant) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      errorMessage: "Recipient is no longer an active participant",
    });
    return;
  }

  const inboxState = await inboxStateRepo.findByPrIdAndUserId(
    payload.prId,
    payload.recipientUserId,
  );
  if ((inboxState?.lastNotifiedMessageId ?? null) !== payload.waveStartMessageId) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "UNREAD_WAVE_NO_LONGER_PENDING",
      errorMessage: "Unread wave is no longer pending for this message id",
    });
    return;
  }

  if ((inboxState?.lastReadMessageId ?? 0) >= payload.waveStartMessageId) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "UNREAD_WAVE_ALREADY_HANDLED",
      errorMessage: "Recipient already handled this unread wave",
    });
    return;
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(recipient.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "PR_MESSAGE",
  );
  if (!snapshot.enabled) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "PR_MESSAGE_OPT_OUT",
      errorMessage: "Recipient disabled PR message notifications",
    });
    return;
  }

  const configured = await subscriptionMessageService.isPRMessageConfigured();
  if (!configured) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "PR_MESSAGE_CHANNEL_NOT_CONFIGURED",
      errorMessage: "PR message subscription channel is not configured",
    });
    return;
  }

  const unreadAfterMessageId = inboxState?.lastReadMessageId ?? null;
  const [latestUnreadMessage, unreadMessageCount, fallbackAuthor] =
    await Promise.all([
      messageRepo.findLatestWithAuthorAfterId(payload.prId, unreadAfterMessageId),
      messageRepo.countByPrIdAfterId(payload.prId, unreadAfterMessageId),
      userRepo.findById(payload.waveStartAuthorUserId),
    ]);

  const latestUnreadMessageCreatedAtIso =
    latestUnreadMessage?.createdAt.toISOString() ??
    payload.firstUnreadMessageCreatedAtIso;
  const latestUnreadAuthorName = latestUnreadMessage
    ? resolveAuthorName(
        latestUnreadMessage.authorNickname,
        latestUnreadMessage.authorRole,
      )
    : resolveAuthorName(
        fallbackAuthor?.nickname ?? null,
        fallbackAuthor?.role ?? null,
      );

  try {
    await subscriptionMessageService.sendPRMessageNotification({
      openId: recipient.openId,
      threadTitle: resolveThreadTitle(request),
      authorName: latestUnreadAuthorName,
      sentAt: formatMessageSentAt(latestUnreadMessageCreatedAtIso),
      messageSummary: formatUnreadMessageSummary(unreadMessageCount),
      page: resolvePrUrl(request),
    });
    const consumeResult =
      await userNotificationOptRepo.consumeOneWechatNotificationCredit(
        recipient.id,
        "PR_MESSAGE",
      );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatPRMessageJobsForUser(recipient.id);
    }
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
  } catch (error) {
    const classified = classifyPRMessageError(error);
    if (classified.code === "43101") {
      await userNotificationOptRepo.clearWechatNotificationCredits(
        recipient.id,
        "PR_MESSAGE",
      );
      await cancelWeChatPRMessageJobsForUser(recipient.id);
    }

    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: classified.code,
      errorMessage: classified.message,
    });
  }
}

export function registerWeChatPRMessageJobs(): void {
  if (prMessageHandlerRegistered) {
    return;
  }

  jobRunner.registerHandler(WECHAT_PR_MESSAGE_JOB_TYPE, handlePRMessageJob);
  prMessageHandlerRegistered = true;
}

export async function scheduleWeChatPRMessageNotification(input: {
  request: PartnerRequest;
  recipientUserId: UserId;
  authorUserId: UserId;
  waveStartMessageId: number;
  firstUnreadMessageCreatedAt: Date;
}): Promise<void> {
  const runAt = resolvePRMessageNotificationRunAt(
    input.firstUnreadMessageCreatedAt,
  );

  await jobRunner.scheduleOnce({
    jobType: WECHAT_PR_MESSAGE_JOB_TYPE,
    runAt,
    ...prMessageSchedulePolicy,
    dedupeKey: buildPRMessageDedupeKey(
      input.recipientUserId,
      input.request.id,
      input.waveStartMessageId,
    ),
    payload: {
      prId: input.request.id,
      recipientUserId: input.recipientUserId,
      waveStartAuthorUserId: input.authorUserId,
      waveStartMessageId: input.waveStartMessageId,
      firstUnreadMessageCreatedAtIso:
        input.firstUnreadMessageCreatedAt.toISOString(),
      scheduledAtIso: runAt.toISOString(),
    },
  });
}

export async function cancelWeChatPRMessageJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_PR_MESSAGE_JOB_TYPE,
    dedupeKeyPrefix: buildPRMessageDedupePrefixForUser(userId),
  });
}
