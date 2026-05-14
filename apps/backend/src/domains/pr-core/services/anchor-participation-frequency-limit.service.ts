import type {
  AnchorEvent,
  AnchorEventParticipationFrequencyLimit,
  PartnerRequest,
  PRId,
  UserId,
} from "../../../entities";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { getTimeWindowClose, getTimeWindowStart } from "./time-window.service";

const anchorEventRepo = new AnchorEventRepository();
const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

export const ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED_CODE =
  "ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED";

export type AnchorEventParticipationFrequencyLimitEvaluation =
  | {
      allowed: true;
      event: AnchorEvent | null;
      limit: AnchorEventParticipationFrequencyLimit;
    }
  | {
      allowed: false;
      event: AnchorEvent;
      limit: NonNullable<AnchorEventParticipationFrequencyLimit>;
      previousPrId: PRId;
      blockedUntilIndex: number;
      targetIndex: number;
    };

const isLimitEnabled = (
  limit: AnchorEventParticipationFrequencyLimit,
): limit is NonNullable<AnchorEventParticipationFrequencyLimit> =>
  limit !== null && limit.intervalPrCount > 0;

const comparePRByEventTimeWindow = (
  left: PartnerRequest,
  right: PartnerRequest,
): number => {
  const leftStart = getTimeWindowStart(left.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightStart = getTimeWindowStart(right.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftStart !== rightStart) return leftStart - rightStart;

  const leftEnd = getTimeWindowClose(left.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightEnd = getTimeWindowClose(right.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;

  return left.id - right.id;
};

const resolveEventPRSequence = async (
  event: AnchorEvent,
  targetPrId: PRId,
): Promise<PartnerRequest[]> => {
  const roots = await prRepo.findByType(event.type);
  return roots
    .filter(
      (root) => root.visibilityStatus === "VISIBLE" || root.id === targetPrId,
    )
    .sort(comparePRByEventTimeWindow);
};

export const evaluateAnchorEventParticipationFrequencyLimit = async (input: {
  request: PartnerRequest;
  userId: UserId | null;
}): Promise<AnchorEventParticipationFrequencyLimitEvaluation> => {
  const event = await anchorEventRepo.findOneByType(input.request.type);
  if (!event) {
    return { allowed: true, event: null, limit: null };
  }

  const limit = event.participationFrequencyLimit;
  if (!isLimitEnabled(limit) || input.userId === null) {
    return { allowed: true, event, limit };
  }

  const sequence = await resolveEventPRSequence(event, input.request.id);
  const targetIndex = sequence.findIndex((root) => root.id === input.request.id);
  if (targetIndex < 0) {
    return { allowed: true, event, limit };
  }

  const sequenceIndexByPrId = new Map<PRId, number>(
    sequence.map((root, index) => [root.id, index]),
  );
  const activeSlots = await partnerRepo.findActiveByUserId(input.userId);
  const previousParticipation = activeSlots
    .map((slot) => ({
      prId: slot.prId,
      index: sequenceIndexByPrId.get(slot.prId),
    }))
    .filter(
      (slot): slot is { prId: PRId; index: number } =>
        slot.index !== undefined && slot.index < targetIndex,
    )
    .sort((left, right) => right.index - left.index)[0];

  if (!previousParticipation) {
    return { allowed: true, event, limit };
  }

  const blockedUntilIndex =
    previousParticipation.index + limit.intervalPrCount;
  if (targetIndex <= blockedUntilIndex) {
    return {
      allowed: false,
      event,
      limit,
      previousPrId: previousParticipation.prId,
      blockedUntilIndex,
      targetIndex,
    };
  }

  return { allowed: true, event, limit };
};

export const assertAnchorEventParticipationFrequencyLimitAllows = async (input: {
  request: PartnerRequest;
  userId: UserId;
}): Promise<void> => {
  const evaluation = await evaluateAnchorEventParticipationFrequencyLimit({
    request: input.request,
    userId: input.userId,
  });
  if (evaluation.allowed) {
    return;
  }

  throw new ProblemDetailsError({
    status: 409,
    type: "https://partner-up.app/problems/anchor-event.participation_frequency_limited",
    code: ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED_CODE,
    localizedText: {
      zhCN: {
        title: "报名频率受限",
        detail: `该活动要求每次参与后间隔 ${evaluation.limit.intervalPrCount} 个完整 PR，当前场次暂时不能报名或候补。`,
      },
      enUS: {
        title: "Participation frequency limited",
        detail: `This event requires ${evaluation.limit.intervalPrCount} complete PRs between participations. You cannot join or waitlist this PR yet.`,
      },
    },
  });
};
