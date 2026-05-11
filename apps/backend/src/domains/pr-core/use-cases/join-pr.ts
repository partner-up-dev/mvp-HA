import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import type { PartnerStatus } from "../../../entities/partner";
import type { User } from "../../../entities/user";
import { resolveUserByOpenId } from "../../user";
import {
  hasAnchorParticipationPolicy,
  isJoinLockedByPolicy,
  isWithinConfirmationWindow,
  resolveAnchorParticipationPolicy,
} from "../services/anchor-participation-policy.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { isJoinableStatus } from "../services/status-rules";
import {
  countActivePartnersForPR,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import { expandFullPR } from "../../anchor-event";
import {
  scheduleWeChatActivityStartReminderJobForParticipant,
  scheduleWeChatNewPartnerNotificationsForJoin,
  scheduleWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { syncAnchorBookingTriggeredState } from "../services/anchor-booking-trigger.service";
import { PRBookingContactRepository } from "../../../repositories/PRBookingContactRepository";
import {
  isBookingContactRequiredForPR,
  normalizeMainlandChinaMobilePhone,
} from "../../pr-booking-support";
import {
  assertPRJoinGatesResolvedForUser,
  hasBookingContactJoinGate,
  BOOKING_CONTACT_PHONE_INVALID_CODE,
} from "../services/join-gates.service";
import { closeAlternativeWaitlistSourcesAfterJoin } from "../services/waitlist-alternative-reminder.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();
const bookingContactRepo = new PRBookingContactRepository();

type CodedHttpException = HTTPException & {
  code?: string;
};

const throwCodedHttpException = (
  status: 400 | 401 | 403 | 404 | 409 | 500,
  message: string,
  code: string,
): never => {
  const error = new HTTPException(status, {
    message,
  }) as CodedHttpException;
  error.code = code;
  throw error;
};

type JoinPRAsUserOptions = {
  bookingContactPhone?: string | null;
};

export async function joinPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status">,
  options: JoinPRAsUserOptions = {},
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  const hasParticipationPolicy = hasAnchorParticipationPolicy(refreshedRequest);

  let targetStatus: Extract<PartnerStatus, "JOINED" | "CONFIRMED"> = "JOINED";
  const bookingContactRequired = await isBookingContactRequiredForPR(id);

  if (hasParticipationPolicy) {
    const policy = resolveAnchorParticipationPolicy(
      refreshedRequest,
      refreshedRequest.time,
    );
    if (isJoinLockedByPolicy(policy)) {
      throw new HTTPException(400, {
        message: "Cannot join - event is locked after join lock",
      });
    }

    if (isWithinConfirmationWindow(policy)) {
      targetStatus = "CONFIRMED";
    }
  }

  if (!isJoinableStatus(refreshedRequest.status as string)) {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is not open",
    });
  }

  if (user.status !== "ACTIVE") {
    throw new HTTPException(403, { message: "Current user is not active" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (existing) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to reload partner request",
      });
    }
    if (hasAnchorParticipationPolicy(latest)) {
      await scheduleWeChatReminderJobsForParticipant(latest, user.id);
      await scheduleWeChatActivityStartReminderJobForParticipant(latest, user.id);
    }
    return toPublicPR(latest, user.id);
  }

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: refreshedRequest.time,
    excludePrId: id,
  });

  const activeCount = await countActivePartnersForPR(id);

  if (bookingContactRequired) {
    const phone = options.bookingContactPhone?.trim() ?? "";
    if (phone) {
      const normalizedPhone = normalizeMainlandChinaMobilePhone(phone);
      if (!normalizedPhone) {
        return throwCodedHttpException(
          400,
          "Phone must match mainland China mobile format (11 digits, starts with 1)",
          BOOKING_CONTACT_PHONE_INVALID_CODE,
        );
      }

      const existingContact = await bookingContactRepo.findByPrId(id);
      if (
        !existingContact ||
        existingContact.ownerPartnerId === null ||
        existingContact.ownerUserId === user.id
      ) {
        await bookingContactRepo.upsertByPrId({
          prId: id,
          ownerPartnerId: existingContact?.ownerPartnerId ?? null,
          ownerUserId: user.id,
          phoneE164: normalizedPhone.phoneE164,
          phoneMasked: normalizedPhone.phoneMasked,
          verifiedSource: "PHONE_INPUT_FORM",
        });
      }
    }
  }

  await assertPRJoinGatesResolvedForUser({
    prId: id,
    userId: user.id,
  });

  if (
    refreshedRequest.maxPartners !== null &&
    activeCount >= refreshedRequest.maxPartners
  ) {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is full",
    });
  }
  const latestHistoricalSlot = await partnerRepo.findReleasedByPrIdAndUserId(
    id,
    user.id,
  );
  const joinedSlot = latestHistoricalSlot
    ? await partnerRepo.reactivateSlot(latestHistoricalSlot.id, targetStatus)
    : await partnerRepo.createSlot({
        prId: id,
        userId: user.id,
        status: targetStatus,
      });
  if (!joinedSlot) {
    throw new HTTPException(500, {
      message: "Failed to persist join participation record",
    });
  }
  const assignedPartnerId = joinedSlot.id;

  if (hasBookingContactJoinGate(refreshedRequest.joinGateConfig)) {
    const contact = await bookingContactRepo.findByPrId(id);
    if (
      contact &&
      contact.ownerPartnerId === null &&
      contact.ownerUserId === user.id
    ) {
      await bookingContactRepo.updateOwnerPartner({
        prId: id,
        ownerPartnerId: assignedPartnerId,
      });
    }
  }

  await userReliabilityRepo.applyDelta(user.id, {
    joined: 1,
    confirmed: targetStatus === "CONFIRMED" ? 1 : 0,
  });

  await recalculatePRStatus(id);
  await syncAnchorBookingTriggeredState(id);

  const afterRecalculate = await prRepo.findById(id);
  if (
    afterRecalculate &&
    hasAnchorParticipationPolicy(afterRecalculate) &&
    afterRecalculate.status === "FULL"
  ) {
    await expandFullPR(id);
  }

  operationLogService.log({
    actorId: user.id,
    action: "partner.join",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: assignedPartnerId, status: targetStatus },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }
  if (hasAnchorParticipationPolicy(latest)) {
    await scheduleWeChatNewPartnerNotificationsForJoin({
      request: latest,
      joinedUserId: user.id,
      joinedPartnerId: assignedPartnerId,
      joinedAt: new Date(),
    });
    await scheduleWeChatReminderJobsForParticipant(latest, user.id);
    await scheduleWeChatActivityStartReminderJobForParticipant(latest, user.id);
  }
  await closeAlternativeWaitlistSourcesAfterJoin({
    alternativeRequest: latest,
    userId: user.id,
    alternativePartnerId: assignedPartnerId,
  });
  return toPublicPR(latest, user.id);
}

export async function joinPR(
  id: PRId,
  openId: string,
  options: JoinPRAsUserOptions = {},
): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return joinPRAsUser(id, user, options);
}
