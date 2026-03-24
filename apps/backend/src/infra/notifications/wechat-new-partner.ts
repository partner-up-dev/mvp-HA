import { z } from "zod";
import type { PartnerId } from "../../entities/partner";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import { userIdSchema, type UserId } from "../../entities/user";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { jobRunner, type JobHandlerContext } from "../jobs";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../services/WeChatSubscriptionMessageService";

const WECHAT_NEW_PARTNER_JOB_TYPE = "wechat.notification.new-partner";
const NEW_PARTNER_DEDUPE_PREFIX = "wechat-new-partner";
const NEW_PARTNER_TIP = "有新搭子加入请及时确认";

const newPartnerPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  joinedUserId: userIdSchema,
  joinedPartnerId: z.coerce.number().int().positive(),
  joinedAtIso: z.string().datetime(),
});

type NewPartnerPayload = z.infer<typeof newPartnerPayloadSchema>;

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

let handlerRegistered = false;

const buildNewPartnerDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  joinedPartnerId: PartnerId,
): string =>
  `${NEW_PARTNER_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${joinedPartnerId}`;

const buildNewPartnerDedupePrefixForUser = (userId: UserId): string =>
  `${NEW_PARTNER_DEDUPE_PREFIX}:${userId}:`;

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

async function handleNewPartnerJob(
  payloadRaw: Record<string, unknown>,
  _context: JobHandlerContext,
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
  if (handlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_NEW_PARTNER_JOB_TYPE, handleNewPartnerJob);
  handlerRegistered = true;
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
