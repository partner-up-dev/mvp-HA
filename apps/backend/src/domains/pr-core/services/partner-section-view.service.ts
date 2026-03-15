import type { PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { ActiveParticipantSummary } from "../../../repositories/PartnerRepository";
import {
  hasEventStarted,
  isBookingDeadlineReached,
} from "./time-window.service";
import type { PublicPR } from "./pr-view.service";
import type { AlternativeBatchRecommendation } from "../use-cases/recommend-alternative-batches";
import type { PRId } from "../../../entities/partner-request";
import type { ResolvedAnchorParticipationPolicy } from "./anchor-participation-policy.service";
import { isExitAllowedStatus, isJoinableStatus } from "./status-rules";

export type PartnerSectionActionBlockedReason =
  | "NONE"
  | "FULL"
  | "NOT_JOINABLE_STATUS"
  | "JOIN_LOCKED"
  | "EVENT_STARTED"
  | "BOOKING_LOCKED"
  | "OUTSIDE_CONFIRM_WINDOW"
  | "NOT_JOINED"
  | "ALREADY_JOINED"
  | "ALREADY_CONFIRMED"
  | "CHECKIN_NOT_OPEN";

export type PartnerSectionRosterItem = {
  partnerId: number;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  isSelf: boolean;
  state: "JOINED" | "CONFIRMED" | "ATTENDED";
};

export type PartnerSectionView = {
  scenario: "COMMUNITY" | "ANCHOR";
  capacity: {
    current: number;
    min: number | null;
    max: number | null;
    remaining: number | null;
    neededToReady: number;
    readiness: "NEEDS_MORE" | "READY" | "FULL" | "ACTIVE" | "UNAVAILABLE";
  };
  roster: PartnerSectionRosterItem[];
  viewer: {
    isCreator: boolean;
    isParticipant: boolean;
    myPartnerId: number | null;
    slotState: "NOT_JOINED" | "JOINED" | "CONFIRMED" | "ATTENDED";
    canJoin: boolean;
    canExit: boolean;
    canConfirm: boolean;
    canCheckIn: boolean;
    joinBlockedReason: PartnerSectionActionBlockedReason;
    exitBlockedReason: PartnerSectionActionBlockedReason;
    confirmBlockedReason: PartnerSectionActionBlockedReason;
    checkInBlockedReason: PartnerSectionActionBlockedReason;
  };
  reminder:
    | {
        supported: false;
        visible: false;
      }
    | {
        supported: true;
        visible: boolean;
      };
  timeline: null | {
    eventStartAt: string | null;
    confirmationStartAt: string | null;
    confirmationEndAt: string | null;
    joinLockAt: string | null;
    bookingDeadlineAt: string | null;
    bookingTriggeredAt: string | null;
  };
  fallbacks: {
    sameBatchAlternatives: Array<{
      id: PRId;
      location: string;
      status: PRStatus;
    }>;
    alternativeBatches: AlternativeBatchRecommendation[];
  };
};

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

const resolveDisplayName = (
  item: ActiveParticipantSummary,
  isCreator: boolean,
  isSelf: boolean,
): string => {
  const nickname = item.nickname?.trim();
  if (nickname) return nickname;
  if (isSelf) return "你";
  if (isCreator) return "发起者";
  return `搭子 #${item.partnerId}`;
};

const resolveReadiness = (
  status: PRStatus,
  current: number,
  min: number | null,
  max: number | null,
): PartnerSectionView["capacity"]["readiness"] => {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "CLOSED" || status === "EXPIRED" || status === "DRAFT") {
    return "UNAVAILABLE";
  }
  if (max !== null && current >= max) return "FULL";
  if (min !== null && current >= min) return "READY";
  return "NEEDS_MORE";
};

const buildBaseSection = (
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  viewerUserId: UserId | null,
): Omit<PartnerSectionView, "scenario" | "reminder" | "timeline" | "fallbacks"> => {
  const current = activeParticipants.length;
  const min = publicPR.minPartners;
  const max = publicPR.maxPartners;
  const remaining = max === null ? null : Math.max(0, max - current);
  const neededToReady =
    min === null ? 0 : Math.max(0, min - current);
  const readiness = resolveReadiness(publicPR.status, current, min, max);

  const roster = activeParticipants.map((item) => {
    const isCreator = Boolean(publicPR.createdBy && item.userId === publicPR.createdBy);
    const isSelf = Boolean(viewerUserId && item.userId === viewerUserId);
    return {
      partnerId: item.partnerId,
      displayName: resolveDisplayName(item, isCreator, isSelf),
      avatarUrl: item.avatar,
      isCreator,
      isSelf,
      state: item.status,
    } satisfies PartnerSectionRosterItem;
  });

  const selfRosterItem =
    publicPR.myPartnerId === null
      ? null
      : roster.find((item) => item.partnerId === publicPR.myPartnerId) ?? null;
  const isCreator = Boolean(viewerUserId && publicPR.createdBy === viewerUserId);
  const isParticipant = publicPR.myPartnerId !== null;

  return {
    capacity: {
      current,
      min,
      max,
      remaining,
      neededToReady,
      readiness,
    },
    roster,
    viewer: {
      isCreator,
      isParticipant,
      myPartnerId: publicPR.myPartnerId,
      slotState: selfRosterItem?.state ?? "NOT_JOINED",
      canJoin: false,
      canExit: false,
      canConfirm: false,
      canCheckIn: false,
      joinBlockedReason: "NONE",
      exitBlockedReason: "NONE",
      confirmBlockedReason: "NONE",
      checkInBlockedReason: "NONE",
    },
  };
};

export function buildCommunityPartnerSection(
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  viewerUserId: UserId | null,
): PartnerSectionView {
  const base = buildBaseSection(publicPR, activeParticipants, viewerUserId);
  const current = activeParticipants.length;

  let canJoin = true;
  let joinBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (base.viewer.isCreator || base.viewer.isParticipant) {
    canJoin = false;
    joinBlockedReason = "ALREADY_JOINED";
  } else if (!isJoinableStatus(publicPR.status)) {
    canJoin = false;
    joinBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (publicPR.maxPartners !== null && current >= publicPR.maxPartners) {
    canJoin = false;
    joinBlockedReason = "FULL";
  }

  let canExit = true;
  let exitBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!base.viewer.isParticipant) {
    canExit = false;
    exitBlockedReason = "NOT_JOINED";
  } else if (!isExitAllowedStatus(publicPR.status)) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  }

  return {
    scenario: "COMMUNITY",
    ...base,
    viewer: {
      ...base.viewer,
      canJoin,
      canExit,
      canConfirm: false,
      canCheckIn: false,
      joinBlockedReason,
      exitBlockedReason,
      confirmBlockedReason: "NONE",
      checkInBlockedReason: "CHECKIN_NOT_OPEN",
    },
    reminder: {
      supported: false,
      visible: false,
    },
    timeline: null,
    fallbacks: {
      sameBatchAlternatives: [],
      alternativeBatches: [],
    },
  };
}

export function buildAnchorPartnerSection(params: {
  publicPR: PublicPR;
  activeParticipants: ActiveParticipantSummary[];
  viewerUserId: UserId | null;
  policy: ResolvedAnchorParticipationPolicy;
  bookingDeadlineAt: Date | null;
  sameBatchAlternatives: Array<{
    id: PRId;
    location: string;
    status: PRStatus;
  }>;
  alternativeBatches: AlternativeBatchRecommendation[];
}): PartnerSectionView {
  const {
    publicPR,
    activeParticipants,
    viewerUserId,
    policy,
    bookingDeadlineAt,
    sameBatchAlternatives,
    alternativeBatches,
  } = params;
  const base = buildBaseSection(publicPR, activeParticipants, viewerUserId);
  const current = activeParticipants.length;
  const joinLocked = policy.joinLockAt
    ? Date.now() >= policy.joinLockAt.getTime()
    : false;
  const bookingLocked = isBookingDeadlineReached(bookingDeadlineAt);
  const started = hasEventStarted(publicPR.time);
  const withinConfirmationWindow =
    policy.confirmationStartAt !== null &&
    policy.confirmationEndAt !== null &&
    Date.now() >= policy.confirmationStartAt.getTime() &&
    Date.now() < policy.confirmationEndAt.getTime();

  let canJoin = true;
  let joinBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (base.viewer.isCreator || base.viewer.isParticipant) {
    canJoin = false;
    joinBlockedReason = "ALREADY_JOINED";
  } else if (!isJoinableStatus(publicPR.status)) {
    canJoin = false;
    joinBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (publicPR.maxPartners !== null && current >= publicPR.maxPartners) {
    canJoin = false;
    joinBlockedReason = "FULL";
  } else if (joinLocked) {
    canJoin = false;
    joinBlockedReason = "JOIN_LOCKED";
  }

  let canExit = true;
  let exitBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!base.viewer.isParticipant) {
    canExit = false;
    exitBlockedReason = "NOT_JOINED";
  } else if (!isExitAllowedStatus(publicPR.status)) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (started) {
    canExit = false;
    exitBlockedReason = "EVENT_STARTED";
  } else if (
    bookingLocked &&
    (base.viewer.slotState === "CONFIRMED" || base.viewer.slotState === "ATTENDED")
  ) {
    canExit = false;
    exitBlockedReason = "BOOKING_LOCKED";
  }

  let canConfirm = true;
  let confirmBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!base.viewer.isParticipant) {
    canConfirm = false;
    confirmBlockedReason = "NOT_JOINED";
  } else if (base.viewer.slotState === "CONFIRMED" || base.viewer.slotState === "ATTENDED") {
    canConfirm = false;
    confirmBlockedReason = "ALREADY_CONFIRMED";
  } else if (!withinConfirmationWindow) {
    canConfirm = false;
    confirmBlockedReason = "OUTSIDE_CONFIRM_WINDOW";
  }

  let canCheckIn = true;
  let checkInBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!base.viewer.isParticipant) {
    canCheckIn = false;
    checkInBlockedReason = "NOT_JOINED";
  } else if (!started) {
    canCheckIn = false;
    checkInBlockedReason = "CHECKIN_NOT_OPEN";
  }

  return {
    scenario: "ANCHOR",
    ...base,
    viewer: {
      ...base.viewer,
      canJoin,
      canExit,
      canConfirm,
      canCheckIn,
      joinBlockedReason,
      exitBlockedReason,
      confirmBlockedReason,
      checkInBlockedReason,
    },
    reminder: {
      supported: true,
      visible: base.viewer.isParticipant,
    },
    timeline: {
      eventStartAt: publicPR.time[0],
      confirmationStartAt: toIsoString(policy.confirmationStartAt),
      confirmationEndAt: toIsoString(policy.confirmationEndAt),
      joinLockAt: toIsoString(policy.joinLockAt),
      bookingDeadlineAt: toIsoString(bookingDeadlineAt),
      bookingTriggeredAt: toIsoString(policy.bookingTriggeredAt),
    },
    fallbacks: {
      sameBatchAlternatives,
      alternativeBatches,
    },
  };
}
