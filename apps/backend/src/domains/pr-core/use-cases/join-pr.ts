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
import { isJoinableStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { doTimeWindowsOverlap, type TimeWindow } from "../services/time-window.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { expandFullAnchorPR } from "../../anchor-event";
import { scheduleWeChatReminderJobsForParticipant } from "../../../infra/notifications";
import { syncAnchorBookingTriggeredState } from "../services/anchor-booking-trigger.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const anchorPRRepo = new AnchorPRRepository();
const userReliabilityRepo = new UserReliabilityRepository();
const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";

type CodedHttpException = HTTPException & {
  code?: string;
};

const isTimeConflictRelevantStatus = (status: string): boolean =>
  status === "OPEN" ||
  status === "READY" ||
  status === "FULL" ||
  status === "LOCKED_TO_START" ||
  status === "ACTIVE";

async function assertNoJoinedTimeWindowOverlap(params: {
  targetPrId: PRId;
  targetTimeWindow: TimeWindow;
  userId: User["id"];
}): Promise<void> {
  const slots = await partnerRepo.findActiveByUserId(params.userId);
  const joinedPrIds = Array.from(
    new Set(slots.map((slot) => slot.prId)),
  ).filter((prId) => prId !== params.targetPrId);

  if (joinedPrIds.length === 0) return;

  const joinedRequests = await prRepo.findByIds(joinedPrIds);
  const conflicted = joinedRequests.find((joinedRequest) => {
    if (!isTimeConflictRelevantStatus(joinedRequest.status)) {
      return false;
    }
    return doTimeWindowsOverlap(params.targetTimeWindow, joinedRequest.time);
  });
  if (!conflicted) return;

  const error = new HTTPException(409, {
    message:
      "Cannot join - time window conflicts with another joined partner request",
  }) as CodedHttpException;
  error.code = JOIN_TIME_WINDOW_CONFLICT_CODE;
  throw error;
}

export async function joinPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status">,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  let targetStatus: PartnerStatus = "JOINED";

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

  await assertNoJoinedTimeWindowOverlap({
    targetPrId: id,
    targetTimeWindow: refreshedRequest.time,
    userId: user.id,
  });

  const activeCount = await partnerRepo.countActiveByPrId(id);
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
    await scheduleWeChatReminderJobsForParticipant(latest, user.id);
  }
  return toPublicPR(latest, user.id);
}

export async function joinPR(id: PRId, openId: string): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return joinPRAsUser(id, user);
}
