import type { PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type {
  ActiveParticipantSummary,
  RosterParticipantSummary,
} from "../../../repositories/PartnerRepository";
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
  | "BOOKING_CONTACT_REQUIRED"
  | "OUTSIDE_CONFIRM_WINDOW"
  | "NOT_JOINED"
  | "ALREADY_JOINED"
  | "ALREADY_CONFIRMED"
  | "CHECKIN_NOT_OPEN";

export type PartnerSectionReleaseState = "RELEASED" | "EXITED";

export type PartnerSectionRosterItem = {
  partnerId: number;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  isSelf: boolean;
  state: "JOINED" | "CONFIRMED" | "ATTENDED" | PartnerSectionReleaseState;
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
    releasedSlot: null | {
      partnerId: number;
      state: PartnerSectionReleaseState;
      releasedAt: string | null;
    };
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
  bookingContact: {
    required: boolean;
    state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
    ownerPartnerId: number | null;
    ownerIsCurrentViewer: boolean;
    maskedPhone: string | null;
    verifiedAt: string | null;
    deadlineAt: string | null;
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
  item: RosterParticipantSummary,
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

const resolveReleaseState = (
  partnerId: number,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): PartnerSectionReleaseState =>
  releaseStateByPartnerId.get(partnerId) ?? "RELEASED";

const resolveRosterState = (
  status: RosterParticipantSummary["status"],
  partnerId: number,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): PartnerSectionRosterItem["state"] => {
  if (status === "RELEASED") {
    return resolveReleaseState(partnerId, releaseStateByPartnerId);
  }
  return status;
};

const buildBaseSection = (
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  rosterParticipants: RosterParticipantSummary[],
  viewerUserId: UserId | null,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): Omit<
  PartnerSectionView,
  "scenario" | "reminder" | "timeline" | "bookingContact" | "fallbacks"
> => {
  const current = activeParticipants.length;
  const min = publicPR.minPartners;
  const max = publicPR.maxPartners;
  const remaining = max === null ? null : Math.max(0, max - current);
  const neededToReady =
    min === null ? 0 : Math.max(0, min - current);
  const readiness = resolveReadiness(publicPR.status, current, min, max);

  const roster = rosterParticipants.map((item) => {
    const isCreator = Boolean(publicPR.createdBy && item.userId === publicPR.createdBy);
    const isSelf = Boolean(viewerUserId && item.userId === viewerUserId);
    return {
      partnerId: item.partnerId,
      displayName: resolveDisplayName(item, isCreator, isSelf),
      avatarUrl: item.avatar,
      isCreator,
      isSelf,
      state: resolveRosterState(
        item.status,
        item.partnerId,
        releaseStateByPartnerId,
      ),
    } satisfies PartnerSectionRosterItem;
  });

  const selfActiveSlot =
    publicPR.myPartnerId === null
      ? null
      : activeParticipants.find((item) => item.partnerId === publicPR.myPartnerId) ??
        null;
  const isCreator = Boolean(viewerUserId && publicPR.createdBy === viewerUserId);
  const isParticipant = publicPR.myPartnerId !== null;
  const releasedSlot = viewerUserId
    ? rosterParticipants
        .filter(
          (item) => item.status === "RELEASED" && item.userId === viewerUserId,
        )
        .sort((a, b) => {
          const aTime = a.releasedAt?.getTime() ?? 0;
          const bTime = b.releasedAt?.getTime() ?? 0;
          if (aTime !== bTime) return bTime - aTime;
          return b.partnerId - a.partnerId;
        })[0] ?? null
    : null;

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
      slotState: selfActiveSlot?.status ?? "NOT_JOINED",
      canJoin: false,
      canExit: false,
      canConfirm: false,
      canCheckIn: false,
      joinBlockedReason: "NONE",
      exitBlockedReason: "NONE",
      confirmBlockedReason: "NONE",
      checkInBlockedReason: "NONE",
      releasedSlot: releasedSlot
        ? {
            partnerId: releasedSlot.partnerId,
            state: resolveReleaseState(
              releasedSlot.partnerId,
              releaseStateByPartnerId,
            ),
            releasedAt: toIsoString(releasedSlot.releasedAt),
          }
        : null,
    },
  };
};

export function buildCommunityPartnerSection(
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  viewerUserId: UserId | null,
  options: {
    rosterParticipants?: RosterParticipantSummary[];
    releaseStateByPartnerId?: Map<number, PartnerSectionReleaseState>;
  } = {},
): PartnerSectionView {
  const rosterParticipants = options.rosterParticipants ?? activeParticipants;
  const releaseStateByPartnerId = options.releaseStateByPartnerId ?? new Map();
  const base = buildBaseSection(
    publicPR,
    activeParticipants,
    rosterParticipants,
    viewerUserId,
    releaseStateByPartnerId,
  );
  const current = activeParticipants.length;

  let canJoin = true;
  let joinBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (base.viewer.isParticipant) {
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
  if (base.viewer.isCreator) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (!base.viewer.isParticipant) {
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
    bookingContact: {
      required: false,
      state: "NOT_REQUIRED",
      ownerPartnerId: null,
      ownerIsCurrentViewer: false,
      maskedPhone: null,
      verifiedAt: null,
      deadlineAt: null,
    },
    fallbacks: {
      sameBatchAlternatives: [],
      alternativeBatches: [],
    },
  };
}

export function buildAnchorPartnerSection(params: {
  publicPR: PublicPR;
  activeParticipants: ActiveParticipantSummary[];
  rosterParticipants: RosterParticipantSummary[];
  viewerUserId: UserId | null;
  policy: ResolvedAnchorParticipationPolicy;
  bookingDeadlineAt: Date | null;
  bookingContact: {
    required: boolean;
    state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
    ownerPartnerId: number | null;
    ownerIsCurrentViewer: boolean;
    maskedPhone: string | null;
    verifiedAt: string | null;
    deadlineAt: string | null;
  };
  sameBatchAlternatives: Array<{
    id: PRId;
    location: string;
    status: PRStatus;
  }>;
  alternativeBatches: AlternativeBatchRecommendation[];
  releaseStateByPartnerId?: Map<number, PartnerSectionReleaseState>;
}): PartnerSectionView {
  const {
    publicPR,
    activeParticipants,
    rosterParticipants,
    viewerUserId,
    policy,
    bookingDeadlineAt,
    bookingContact,
    sameBatchAlternatives,
    alternativeBatches,
    releaseStateByPartnerId = new Map(),
  } = params;
  const base = buildBaseSection(
    publicPR,
    activeParticipants,
    rosterParticipants,
    viewerUserId,
    releaseStateByPartnerId,
  );
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
  if (base.viewer.isParticipant) {
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
  if (base.viewer.isCreator) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (!base.viewer.isParticipant) {
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
  } else if (
    bookingContact.required &&
    bookingContact.state !== "VERIFIED"
  ) {
    canConfirm = false;
    confirmBlockedReason = "BOOKING_CONTACT_REQUIRED";
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
    bookingContact,
    fallbacks: {
      sameBatchAlternatives,
      alternativeBatches,
    },
  };
}
