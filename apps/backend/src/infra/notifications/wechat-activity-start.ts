import { z } from "zod";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import { userIdSchema, type UserId } from "../../entities/user";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { NotificationDeliveryRepository } from "../../repositories/NotificationDeliveryRepository";
import { getTimeWindowStart } from "../../domains/pr-core/services/time-window.service";
import {
  jobRunner,
  type JobHandlerContext,
} from "../jobs";
import { activityStartReminderSchedulePolicy } from "./job-schedule-policy";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../services/WeChatSubscriptionMessageService";
import { env } from "../../lib/env";

const WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE =
  "wechat.notification.activity-start-reminder";
const ACTIVITY_START_REMINDER_DEDUPE_PREFIX =
  "wechat-activity-start-reminder";
const ACTIVITY_START_REMINDER_LEAD_MS = 20 * 60 * 1000;
const ACTIVITY_START_REMARK = "提前时间更充足";

const activityStartReminderPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  userId: userIdSchema,
  scheduledAtIso: z.string().datetime(),
});

type ActivityStartReminderPayload = z.infer<
  typeof activityStartReminderPayloadSchema
>;

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

let activityStartReminderHandlerRegistered = false;

const buildActivityStartReminderDedupeKey = (
  prId: PRId,
  userId: UserId,
): string => `${ACTIVITY_START_REMINDER_DEDUPE_PREFIX}:${userId}:${prId}`;

const buildActivityStartReminderDedupePrefixForUser = (
  userId: UserId,
): string => `${ACTIVITY_START_REMINDER_DEDUPE_PREFIX}:${userId}:`;

const resolveActivityStartReminderRunAt = (
  request: Pick<PartnerRequest, "time">,
): Date | null => {
  const startAt = getTimeWindowStart(request.time);
  if (!startAt) {
    return null;
  }
  return new Date(startAt.getTime() - ACTIVITY_START_REMINDER_LEAD_MS);
};

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

const resolveActivityName = (request: PartnerRequest): string => {
  const type = request.type?.trim() ?? "";
  const title = request.title?.trim() ?? "";
  const parts = [type, title].filter(
    (value, index, values) => value.length > 0 && values.indexOf(value) === index,
  );
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return `活动 #${request.id}`;
};

const classifyActivityStartReminderError = (
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
  payload: ActivityStartReminderPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.userId,
    notificationKind: "ACTIVITY_START_REMINDER",
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

async function handleActivityStartReminderJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = activityStartReminderPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid activity start reminder job payload");
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

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "ACTIVITY_START_REMINDER",
  );
  if (!snapshot.enabled) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "ACTIVITY_START_REMINDER_OPT_OUT",
      errorMessage: "User disabled activity start reminders",
    });
    return;
  }

  const request = await prRepo.findById(payload.prId);
  if (!request || request.prKind !== "ANCHOR") {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "PR_MISSING_OR_UNSUPPORTED",
      errorMessage: "Anchor partner request not found",
    });
    return;
  }

  if (!user.openId) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "User has no bound WeChat openId",
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

  const configured =
    await subscriptionMessageService.isActivityStartReminderConfigured();
  if (!configured) {
    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "ACTIVITY_START_REMINDER_CHANNEL_NOT_CONFIGURED",
      errorMessage:
        "Activity start reminder subscription message channel is not configured",
    });
    return;
  }

  try {
    await subscriptionMessageService.sendActivityStartReminder({
      openId: user.openId,
      activityName: resolveActivityName(request),
      startAt: formatReminderDateField(startAt),
      location: request.location?.trim() || "地点待定",
      remark: ACTIVITY_START_REMARK,
      page: resolvePrUrl(request),
    });

    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult =
      await userNotificationOptRepo.consumeOneWechatNotificationCredit(
        user.id,
        "ACTIVITY_START_REMINDER",
      );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatActivityStartReminderJobsForUser(user.id);
    }
  } catch (error) {
    const classified = classifyActivityStartReminderError(error);
    if (classified.code === "43101") {
      await userNotificationOptRepo.clearWechatNotificationCredits(
        user.id,
        "ACTIVITY_START_REMINDER",
      );
      await cancelWeChatActivityStartReminderJobsForUser(user.id);
    }

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

export function registerWeChatActivityStartReminderJobs(): void {
  if (activityStartReminderHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(
    WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    handleActivityStartReminderJob,
  );
  activityStartReminderHandlerRegistered = true;
}

export async function scheduleWeChatActivityStartReminderJobForParticipant(
  request: PartnerRequest,
  userId: UserId,
): Promise<void> {
  if (request.prKind !== "ANCHOR") {
    return;
  }

  const user = await userRepo.findById(userId);
  const notificationOpt = user
    ? await userNotificationOptRepo.findByUserId(userId)
    : null;
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "ACTIVITY_START_REMINDER",
  );
  if (!user || !snapshot.enabled) {
    return;
  }

  const runAt = resolveActivityStartReminderRunAt(request);
  if (!runAt || runAt.getTime() <= Date.now()) {
    return;
  }

  await jobRunner.scheduleOnce({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    runAt,
    ...activityStartReminderSchedulePolicy,
    dedupeKey: buildActivityStartReminderDedupeKey(request.id, userId),
    payload: {
      prId: request.id,
      userId,
      scheduledAtIso: runAt.toISOString(),
    },
  });
}

export async function cancelWeChatActivityStartReminderJobsForParticipant(
  prId: PRId,
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    dedupeKey: buildActivityStartReminderDedupeKey(prId, userId),
  });
}

export async function cancelWeChatActivityStartReminderJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    dedupeKeyPrefix: buildActivityStartReminderDedupePrefixForUser(userId),
  });
}

export async function rebuildWeChatActivityStartReminderJobsForUser(
  userId: UserId,
): Promise<void> {
  await cancelWeChatActivityStartReminderJobsForUser(userId);

  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const requests = await prRepo.findByIds(uniquePrIds);
  for (const request of requests) {
    await scheduleWeChatActivityStartReminderJobForParticipant(request, userId);
  }
}
