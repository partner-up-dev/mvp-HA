import { z } from "zod";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import {
  reminderTypeSchema,
  type ReminderType,
} from "../../entities/notification-delivery";
import { userIdSchema, type UserId } from "../../entities/user";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { NotificationDeliveryRepository } from "../../repositories/NotificationDeliveryRepository";
import { getTimeWindowStart } from "../../domains/pr-core/services/time-window.service";
import { jobRunner, type JobHandlerContext } from "../jobs";
import {
  WeChatTemplateMessageError,
  WeChatTemplateMessageService,
} from "../../services/WeChatTemplateMessageService";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../services/WeChatSubscriptionMessageService";
import { env } from "../../lib/env";

const WECHAT_REMINDER_JOB_TYPE = "wechat.reminder.confirmation";
const REMINDER_DEDUPE_PREFIX = "wechat-reminder";
const REMINDER_TYPES: readonly ReminderType[] = ["T_MINUS_24H", "T_MINUS_2H"];

const reminderJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  userId: userIdSchema,
  reminderType: reminderTypeSchema,
  scheduledAtIso: z.string().datetime(),
});

type ReminderJobPayload = z.infer<typeof reminderJobPayloadSchema>;

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const deliveryRepo = new NotificationDeliveryRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();
const templateService = new WeChatTemplateMessageService();

let handlerRegistered = false;

const reminderOffsetMsByType: Record<ReminderType, number> = {
  T_MINUS_24H: 24 * 60 * 60 * 1000,
  T_MINUS_2H: 2 * 60 * 60 * 1000,
};

const buildReminderDedupeKey = (
  prId: PRId,
  userId: UserId,
  reminderType: ReminderType,
): string => `${REMINDER_DEDUPE_PREFIX}:${userId}:${prId}:${reminderType}`;

const buildReminderDedupePrefixForUser = (userId: UserId): string =>
  `${REMINDER_DEDUPE_PREFIX}:${userId}:`;

const getReminderRunAt = (
  request: PartnerRequest,
  reminderType: ReminderType,
): Date | null => {
  const start = getTimeWindowStart(request.time);
  if (!start) return null;
  return new Date(start.getTime() - reminderOffsetMsByType[reminderType]);
};

const resolvePrUrl = (prId: PRId): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;
  try {
    const url = new URL(frontendUrl);
    url.pathname = `/pr/${prId}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const formatReminderTimeLabel = (startAt: Date): string =>
  startAt.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatReminderDateField = (startAt: Date): string => {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(startAt);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
};

const recordDelivery = async (input: {
  jobId: number;
  payload: ReminderJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.userId,
    reminderType: input.payload.reminderType,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

const classifyReminderError = (
  error: unknown,
): { code: string | null; message: string } => {
  if (error instanceof WeChatTemplateMessageError) {
    return {
      code: error.errorCode,
      message: error.message,
    };
  }
  if (error instanceof WeChatSubscriptionMessageError) {
    return {
      code: error.errorCode,
      message: error.message,
    };
  }
  if (error instanceof Error) {
    return { code: null, message: error.message };
  }
  return { code: null, message: String(error) };
};

const resolveReminderTitle = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `活动 #${request.id}`;

const resolveReminderOrderNo = (
  request: PartnerRequest,
  userId: UserId,
): string => `PR-${request.id}-${userId.slice(-6)}`;

const resolveReminderRemark = (reminderType: ReminderType): string =>
  reminderType === "T_MINUS_24H" ? "活动前24小时提醒" : "活动前2小时提醒";

async function handleReminderJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = reminderJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid wechat reminder job payload");
  }
  const payload = parseResult.data;

  const user = await userRepo.findById(payload.userId);
  if (!user || user.status !== "ACTIVE") {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    });
    return;
  }

  if (!user.wechatReminderOptIn) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "REMINDER_OPT_OUT",
      errorMessage: "User disabled wechat reminders",
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

  const startAt = getTimeWindowStart(request.time);
  if (!startAt || startAt.getTime() <= Date.now()) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "PR_NOT_UPCOMING",
      errorMessage: "Partner request has no future start time",
    });
    return;
  }

  const slot = await partnerRepo.findActiveByPrIdAndUserId(request.id, user.id);
  if (!slot) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "SLOT_NOT_ACTIVE",
      errorMessage: "Partner slot is no longer active",
    });
    return;
  }

  const submsgConfigured =
    subscriptionMessageService.isConfirmationReminderConfigured();
  const templateConfigured = templateService.isReminderConfigured();
  if (!submsgConfigured && !templateConfigured) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "REMINDER_CHANNEL_NOT_CONFIGURED",
      errorMessage:
        "Neither subscription reminder channel nor template reminder channel is configured",
    });
    return;
  }

  try {
    if (submsgConfigured) {
      await subscriptionMessageService.sendConfirmationReminder({
        openId: user.openId,
        orderContent: resolveReminderTitle(request),
        orderNo: resolveReminderOrderNo(request, user.id),
        appointmentAt: formatReminderDateField(startAt),
        remark: resolveReminderRemark(payload.reminderType),
      });
    } else {
      await templateService.sendReminderTemplate({
        openId: user.openId,
        reminderType: payload.reminderType,
        title: resolveReminderTitle(request),
        startAtLabel: formatReminderTimeLabel(startAt),
        location: request.location,
        prUrl: resolvePrUrl(request.id),
      });
    }

    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
  } catch (error) {
    const classified = classifyReminderError(error);
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: classified.code,
      errorMessage: classified.message,
    });
    throw error;
  }
}

export function registerWeChatReminderJobs(): void {
  if (handlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_REMINDER_JOB_TYPE, handleReminderJob);
  handlerRegistered = true;
}

export async function scheduleWeChatReminderJobsForParticipant(
  request: PartnerRequest,
  userId: UserId,
): Promise<void> {
  const user = await userRepo.findById(userId);
  if (!user || !user.wechatReminderOptIn) {
    return;
  }

  for (const reminderType of REMINDER_TYPES) {
    const runAt = getReminderRunAt(request, reminderType);
    if (!runAt || runAt.getTime() <= Date.now()) {
      continue;
    }

    await jobRunner.scheduleOnce({
      jobType: WECHAT_REMINDER_JOB_TYPE,
      runAt,
      dedupeKey: buildReminderDedupeKey(request.id, userId, reminderType),
      payload: {
        prId: request.id,
        userId,
        reminderType,
        scheduledAtIso: runAt.toISOString(),
      },
    });
  }
}

export async function cancelWeChatReminderJobsForParticipant(
  prId: PRId,
  userId: UserId,
): Promise<number> {
  let deleted = 0;
  for (const reminderType of REMINDER_TYPES) {
    deleted += await jobRunner.deletePendingJobsByDedupe({
      jobType: WECHAT_REMINDER_JOB_TYPE,
      dedupeKey: buildReminderDedupeKey(prId, userId, reminderType),
    });
  }
  return deleted;
}

export async function cancelWeChatReminderJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_REMINDER_JOB_TYPE,
    dedupeKeyPrefix: buildReminderDedupePrefixForUser(userId),
  });
}

export async function rebuildWeChatReminderJobsForUser(
  userId: UserId,
): Promise<void> {
  await cancelWeChatReminderJobsForUser(userId);

  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const requests = await prRepo.findByIds(uniquePrIds);
  for (const request of requests) {
    await scheduleWeChatReminderJobsForParticipant(request, userId);
  }
}
