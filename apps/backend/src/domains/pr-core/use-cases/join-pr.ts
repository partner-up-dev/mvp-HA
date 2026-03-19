import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import type { PartnerStatus } from "../../../entities/partner";
import type { User } from "../../../entities/user";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import {
  isJoinLockedByPolicy,
  isWithinConfirmationWindow,
  resolveAnchorParticipationPolicy,
} from "../services/anchor-participation-policy.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { isJoinableStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { expandFullAnchorPR } from "../../anchor-event";
import {
  scheduleWeChatNewPartnerNotificationsForJoin,
  scheduleWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { syncAnchorBookingTriggeredState } from "../services/anchor-booking-trigger.service";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { WeChatPhoneService } from "../../../services/WeChatPhoneService";
import {
  isBookingContactRequiredForPR,
  resolveBookingContactState,
} from "../../pr-booking-support";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const anchorPRRepo = new AnchorPRRepository();
const userReliabilityRepo = new UserReliabilityRepository();
const bookingContactRepo = new AnchorPRBookingContactRepository();
const weChatPhoneService = new WeChatPhoneService();
const BOOKING_CONTACT_OWNER_REQUIRED_CODE = "BOOKING_CONTACT_OWNER_REQUIRED";
const BOOKING_CONTACT_REQUIRED_CODE = "BOOKING_CONTACT_REQUIRED";
const WECHAT_PHONE_VERIFY_FAILED_CODE = "WECHAT_PHONE_VERIFY_FAILED";

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
  wechatPhoneCredential?: string | null;
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

  let targetStatus: PartnerStatus = "JOINED";
  const bookingContactRequired =
    refreshedRequest.prKind === "ANCHOR"
      ? await isBookingContactRequiredForPR(id)
      : false;

  if (refreshedRequest.prKind === "ANCHOR") {
    const anchor = await anchorPRRepo.findByPrId(id);
    if (!anchor) {
      throw new HTTPException(500, {
        message: "Anchor PR subtype row missing",
      });
    }
    const policy = resolveAnchorParticipationPolicy(anchor, refreshedRequest.time);
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
    if (latest.prKind === "ANCHOR") {
      await scheduleWeChatReminderJobsForParticipant(latest, user.id);
    }
    return toPublicPR(latest, user.id);
  }

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: refreshedRequest.time,
    excludePrId: id,
  });

  const activeCount = await partnerRepo.countActiveByPrId(id);
  let verifiedBookingContact: {
    phoneE164: string;
    phoneMasked: string;
  } | null = null;

  if (refreshedRequest.prKind === "ANCHOR" && bookingContactRequired) {
    const isFirstActiveOwnerJoin = activeCount === 0;

    if (isFirstActiveOwnerJoin) {
      const credential = options.wechatPhoneCredential?.trim() ?? "";
      if (!credential) {
        return throwCodedHttpException(
          409,
          "Cannot join - booking contact owner must verify phone first",
          BOOKING_CONTACT_OWNER_REQUIRED_CODE,
        );
      }

      try {
        verifiedBookingContact =
          await weChatPhoneService.resolvePhoneFromCredential(credential);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to verify phone with WeChat";
        return throwCodedHttpException(
          400,
          message,
          WECHAT_PHONE_VERIFY_FAILED_CODE,
        );
      }
    } else if (targetStatus === "CONFIRMED") {
      const bookingContactState = await resolveBookingContactState({
        prId: id,
        viewerUserId: user.id,
      });
      if (bookingContactState.state !== "VERIFIED") {
        return throwCodedHttpException(
          409,
          "Cannot join - booking contact is required before confirmation",
          BOOKING_CONTACT_REQUIRED_CODE,
        );
      }
    }
  }

  if (
    refreshedRequest.maxPartners !== null &&
    activeCount >= refreshedRequest.maxPartners
  ) {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is full",
    });
  }

  let assignedPartnerId: number;
  const released = await partnerRepo.findFirstReleasedSlot(id);
  if (released) {
    await partnerRepo.assignSlot(released.id, user.id, targetStatus);
    assignedPartnerId = released.id;
  } else if (refreshedRequest.maxPartners === null) {
    const created = await partnerRepo.createSlot({
      prId: id,
      userId: user.id,
      status: targetStatus,
    });
    assignedPartnerId = created!.id;
  } else {
    throw new HTTPException(400, {
      message: "Cannot join - partner request is full",
    });
  }

  if (
    refreshedRequest.prKind === "ANCHOR" &&
    bookingContactRequired &&
    activeCount === 0 &&
    verifiedBookingContact
  ) {
    await bookingContactRepo.upsertByPrId({
      prId: id,
      ownerPartnerId: assignedPartnerId,
      ownerUserId: user.id,
      phoneE164: verifiedBookingContact.phoneE164,
      phoneMasked: verifiedBookingContact.phoneMasked,
    });
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
    afterRecalculate.prKind === "ANCHOR" &&
    afterRecalculate.status === "FULL"
  ) {
    await expandFullAnchorPR(id);
  }

  // Emit domain event
  const event = await eventBus.publish(
    "partner.joined",
    "partner_request",
    String(id),
    {
      prId: id,
      partnerId: assignedPartnerId,
      userId: user.id,
      autoConfirmed: targetStatus === "CONFIRMED",
    },
  );
  void writeToOutbox(event);

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
  if (latest.prKind === "ANCHOR") {
    await scheduleWeChatNewPartnerNotificationsForJoin({
      request: latest,
      joinedUserId: user.id,
      joinedPartnerId: assignedPartnerId,
      joinedAt: new Date(),
    });
    await scheduleWeChatReminderJobsForParticipant(latest, user.id);
  }
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
