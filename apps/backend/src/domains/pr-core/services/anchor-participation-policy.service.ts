import { HTTPException } from "hono/http-exception";
import type { AnchorPartnerRequest } from "../../../entities/anchor-partner-request";
import type { PartnerRequestFields } from "../../../entities/partner-request";
import { getTimeWindowStart } from "./time-window.service";

export const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
export const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
export const DEFAULT_JOIN_LOCK_OFFSET_MINUTES =
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;

export type AnchorParticipationPolicyOffsets = {
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

export type ResolvedAnchorParticipationPolicy = AnchorParticipationPolicyOffsets & {
  confirmationStartAt: Date | null;
  confirmationEndAt: Date | null;
  joinLockAt: Date | null;
  bookingTriggeredAt: Date | null;
};

export function validateAnchorParticipationPolicyOffsets(
  offsets: AnchorParticipationPolicyOffsets,
): void {
  const {
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  } = offsets;

  const values = [
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new HTTPException(400, {
      message: "Anchor participation policy offsets must be non-negative integers",
    });
  }

  if (confirmationStartOffsetMinutes <= confirmationEndOffsetMinutes) {
    throw new HTTPException(400, {
      message:
        "Confirmation start must be earlier than confirmation end for anchor participation policy",
    });
  }

  if (joinLockOffsetMinutes < confirmationEndOffsetMinutes) {
    throw new HTTPException(400, {
      message:
        "Join lock must not be later than confirmation end for anchor participation policy",
    });
  }
}

export function resolveAnchorParticipationPolicy(
  anchor: Pick<
    AnchorPartnerRequest,
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
    | "bookingTriggeredAt"
  >,
  timeWindow: PartnerRequestFields["time"],
): ResolvedAnchorParticipationPolicy {
  const confirmationStartOffsetMinutes =
    anchor.confirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES;
  const confirmationEndOffsetMinutes =
    anchor.confirmationEndOffsetMinutes ??
    DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;
  const joinLockOffsetMinutes =
    anchor.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES;

  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  });

  const startAt = getTimeWindowStart(timeWindow);
  const resolveOffsetDate = (offsetMinutes: number): Date | null => {
    if (!startAt) return null;
    return new Date(startAt.getTime() - offsetMinutes * 60 * 1000);
  };

  return {
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
    confirmationStartAt: resolveOffsetDate(confirmationStartOffsetMinutes),
    confirmationEndAt: resolveOffsetDate(confirmationEndOffsetMinutes),
    joinLockAt: resolveOffsetDate(joinLockOffsetMinutes),
    bookingTriggeredAt: anchor.bookingTriggeredAt ?? null,
  };
}

export function hasConfirmationWindowOpened(
  policy: Pick<ResolvedAnchorParticipationPolicy, "confirmationStartAt">,
): boolean {
  if (!policy.confirmationStartAt) return false;
  return Date.now() >= policy.confirmationStartAt.getTime();
}

export function hasConfirmationWindowEnded(
  policy: Pick<ResolvedAnchorParticipationPolicy, "confirmationEndAt">,
): boolean {
  if (!policy.confirmationEndAt) return false;
  return Date.now() >= policy.confirmationEndAt.getTime();
}

export function isWithinConfirmationWindow(
  policy: Pick<
    ResolvedAnchorParticipationPolicy,
    "confirmationStartAt" | "confirmationEndAt"
  >,
): boolean {
  if (!policy.confirmationStartAt || !policy.confirmationEndAt) return false;

  const now = Date.now();
  return (
    now >= policy.confirmationStartAt.getTime() &&
    now < policy.confirmationEndAt.getTime()
  );
}

export function isJoinLockedByPolicy(
  policy: Pick<ResolvedAnchorParticipationPolicy, "joinLockAt">,
): boolean {
  if (!policy.joinLockAt) return false;
  return Date.now() >= policy.joinLockAt.getTime();
}
