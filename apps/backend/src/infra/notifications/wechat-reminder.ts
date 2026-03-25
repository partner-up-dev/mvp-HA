import { z } from "zod";
import type { PartnerId } from "../../entities/partner";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import {
  reminderTypeSchema,
  type ReminderType,
} from "../../entities/notification-delivery";
import { userIdSchema, type UserId } from "../../entities/user";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { NotificationDeliveryRepository } from "../../repositories/NotificationDeliveryRepository";
import { getTimeWindowStart } from "../../domains/pr-core/services/time-window.service";
import { jobRunner, NO_LATE_TOLERANCE_MS, type JobHandlerContext } from "../jobs";
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
const WECHAT_NEW_PARTNER_JOB_TYPE = "wechat.notification.new-partner";
const NEW_PARTNER_DEDUPE_PREFIX = "wechat-new-partner";
const NEW_PARTNER_TIP = "有新搭子加入请及时确认";

const reminderJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  userId: userIdSchema,
  reminderType: reminderTypeSchema,
  scheduledAtIso: z.string().datetime(),
});

type ReminderJobPayload = z.infer<typeof reminderJobPayloadSchema>;

const newPartnerPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  joinedUserId: userIdSchema,
  joinedPartnerId: z.coerce.number().int().positive(),
  joinedAtIso: z.string().datetime(),
});

type NewPartnerPayload = z.infer<typeof newPartnerPayloadSchema>;

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();
const templateService = new WeChatTemplateMessageService();

let reminderHandlerRegistered = false;
let newPartnerHandlerRegistered = false;

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

const buildNewPartnerDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  joinedPartnerId: PartnerId,
): string =>
  `${NEW_PARTNER_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${joinedPartnerId}`;

const buildNewPartnerDedupePrefixForUser = (userId: UserId): string =>
  `${NEW_PARTNER_DEDUPE_PREFIX}:${userId}:`;

const getReminderRunAt = (
  request: PartnerRequest,
  reminderType: ReminderType,
): Date | null => {
  const start = getTimeWindowStart(request.time);
  if (!start) return null;
  return new Date(start.getTime() - reminderOffsetMsByType[reminderType]);
};

const resolvePrUrl = (request: PartnerRequest): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;
  try {
    const url = new URL(frontendUrl);
    url.pathname =
      request.prKind === "ANCHOR"
        ? `/apr/${request.id}`
        : `/cpr/${request.id}`;
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

const resolveTeamName = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `PR#${request.id}`;

const resolveApplicantName = (nickname: string | null): string => {
  const normalized = nickname?.trim();
  if (!normalized) return "新搭子";
  return normalized;
};

const formatAppliedAt = (joinedAtIso: string): string =>
  new Date(joinedAtIso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const classifyNewPartnerError = (
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

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  if (!notificationOpt?.wechatReminderOptIn) {
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

  const submsgConfigured =
    await subscriptionMessageService.isConfirmationReminderConfigured();
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
        prUrl: resolvePrUrl(request),
      });
    }

    await recordDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
  } catch (error) {
    const classified = classifyReminderError(error);
    if (classified.code === "43101") {
      await userNotificationOptRepo.upsertWechatNotificationSubscription(
        user.id,
        "REMINDER_CONFIRMATION",
        false,
      );
      await cancelWeChatReminderJobsForUser(user.id);
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

export function registerWeChatReminderJobs(): void {
  if (reminderHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_REMINDER_JOB_TYPE, handleReminderJob);
  reminderHandlerRegistered = true;
}

export async function scheduleWeChatReminderJobsForParticipant(
  request: PartnerRequest,
  userId: UserId,
): Promise<void> {
  const user = await userRepo.findById(userId);
  const notificationOpt = user
    ? await userNotificationOptRepo.findByUserId(userId)
    : null;
  if (!user || !notificationOpt?.wechatReminderOptIn) {
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
      lateToleranceMs: NO_LATE_TOLERANCE_MS,
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

async function handleNewPartnerJob(
  payloadRaw: Record<string, unknown>,
): Promise<void> {
  const parseResult = newPartnerPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid new partner notification job payload");
  }
  const payload = parseResult.data;

  const recipient = await userRepo.findById(payload.recipientUserId);
  if (!recipient || recipient.status !== "ACTIVE" || !recipient.openId) {
    return;
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(recipient.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "NEW_PARTNER",
  );
  if (!snapshot.enabled) {
    return;
  }

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(
    payload.prId,
    recipient.id,
  );
  if (!stillParticipant) {
    return;
  }

  const request = await prRepo.findById(payload.prId);
  if (!request || request.prKind !== "ANCHOR") {
    return;
  }

  const configured = await subscriptionMessageService.isNewPartnerConfigured();
  if (!configured) {
    return;
  }

  const joinedUser = await userRepo.findById(payload.joinedUserId);
  const applicantName = resolveApplicantName(joinedUser?.nickname ?? null);

  try {
    await subscriptionMessageService.sendNewPartnerNotification({
      openId: recipient.openId,
      applicantName,
      teamName: resolveTeamName(request),
      tip: NEW_PARTNER_TIP,
      appliedAt: formatAppliedAt(payload.joinedAtIso),
    });
  } catch (error) {
    const classified = classifyNewPartnerError(error);
    if (classified.code === "43101") {
      await userNotificationOptRepo.upsertWechatNotificationSubscription(
        recipient.id,
        "NEW_PARTNER",
        false,
      );
      await cancelWeChatNewPartnerJobsForUser(recipient.id);
    }

    throw new Error(
      classified.code
        ? `${classified.code}: ${classified.message}`
        : classified.message,
    );
  }
}

export function registerWeChatNewPartnerJobs(): void {
  if (newPartnerHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_NEW_PARTNER_JOB_TYPE, handleNewPartnerJob);
  newPartnerHandlerRegistered = true;
}

export async function scheduleWeChatNewPartnerNotificationsForJoin(input: {
  request: PartnerRequest;
  joinedUserId: UserId;
  joinedPartnerId: PartnerId;
  joinedAt: Date;
}): Promise<void> {
  if (input.request.prKind !== "ANCHOR") {
    return;
  }

  const configured = await subscriptionMessageService.isNewPartnerConfigured();
  if (!configured) {
    return;
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    input.request.id,
  );
  const recipientUserIds = Array.from(
    new Set(
      activeParticipants
        .map((item) => item.userId)
        .filter(
          (userId): userId is UserId =>
            userId !== null && userId !== input.joinedUserId,
        ),
    ),
  );

  for (const recipientUserId of recipientUserIds) {
    const recipientUser = await userRepo.findById(recipientUserId);
    if (!recipientUser || recipientUser.status !== "ACTIVE" || !recipientUser.openId) {
      continue;
    }

    const notificationOpt = await userNotificationOptRepo.findByUserId(
      recipientUserId,
    );
    const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
      notificationOpt,
      "NEW_PARTNER",
    );
    if (!snapshot.enabled) {
      continue;
    }

    await jobRunner.scheduleOnce({
      jobType: WECHAT_NEW_PARTNER_JOB_TYPE,
      runAt: new Date(),
      lateToleranceMs: NO_LATE_TOLERANCE_MS,
      dedupeKey: buildNewPartnerDedupeKey(
        recipientUserId,
        input.request.id,
        input.joinedPartnerId,
      ),
      payload: {
        prId: input.request.id,
        recipientUserId,
        joinedUserId: input.joinedUserId,
        joinedPartnerId: input.joinedPartnerId,
        joinedAtIso: input.joinedAt.toISOString(),
      },
    });
  }
}

export async function cancelWeChatNewPartnerJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_NEW_PARTNER_JOB_TYPE,
    dedupeKeyPrefix: buildNewPartnerDedupePrefixForUser(userId),
  });
}
