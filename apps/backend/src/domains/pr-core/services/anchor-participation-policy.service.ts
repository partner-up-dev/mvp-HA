import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerRequest } from "../../../entities/partner-request";
import { getTimeWindowStart } from "./time-window.service";

export const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
export const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
export const DEFAULT_JOIN_LOCK_OFFSET_MINUTES =
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;

export type AnchorParticipationPolicyOffsets = {
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

export type ResolvedAnchorParticipationPolicy = AnchorParticipationPolicyOffsets & {
  confirmationStartAt: Date | null;
  confirmationEndAt: Date | null;
  joinLockAt: Date | null;
};

export function validateAnchorParticipationPolicyOffsets(
  offsets: AnchorParticipationPolicyOffsets,
): void {
  const {
    confirmationEnabled,
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
    return throwHttpProblem({ status: 400, detail: "Anchor participation policy offsets must be non-negative integers" });
  }

  if (
    confirmationEnabled &&
    confirmationStartOffsetMinutes <= confirmationEndOffsetMinutes
  ) {
    return throwHttpProblem({ status: 400, detail: "Confirmation start must be earlier than confirmation end for anchor participation policy" });
  }

  if (confirmationEnabled && joinLockOffsetMinutes < confirmationEndOffsetMinutes) {
    return throwHttpProblem({ status: 400, detail: "Join lock must not be later than confirmation end for anchor participation policy" });
  }
}

export function resolveAnchorParticipationPolicy(
  request: Pick<
    PartnerRequest,
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
    | "confirmationEnabled"
  >,
  timeWindow: PartnerRequest["time"],
): ResolvedAnchorParticipationPolicy {
  const confirmationEnabled = request.confirmationEnabled;
  const confirmationStartOffsetMinutes =
    request.confirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES;
  const confirmationEndOffsetMinutes =
    request.confirmationEndOffsetMinutes ??
    DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;
  const joinLockOffsetMinutes =
    request.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES;

  validateAnchorParticipationPolicyOffsets({
    confirmationEnabled,
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
    confirmationEnabled,
    confirmationStartAt: confirmationEnabled
      ? resolveOffsetDate(confirmationStartOffsetMinutes)
      : null,
    confirmationEndAt: confirmationEnabled
      ? resolveOffsetDate(confirmationEndOffsetMinutes)
      : null,
    joinLockAt: resolveOffsetDate(joinLockOffsetMinutes),
  };
}

export function hasEnabledConfirmationPolicy(
  request: Pick<
    PartnerRequest,
    | "confirmationEnabled"
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
  >,
): boolean {
  return hasAnchorParticipationPolicy(request) && request.confirmationEnabled;
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

export function hasAnchorParticipationPolicy(
  request: Pick<
    PartnerRequest,
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
  >,
): boolean {
  return (
    request.confirmationStartOffsetMinutes !== null &&
    request.confirmationEndOffsetMinutes !== null &&
    request.joinLockOffsetMinutes !== null
  );
}
