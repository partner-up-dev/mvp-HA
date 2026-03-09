import type {
  AnchorEventBatchSupportOverride,
  AnchorEventSupportResource,
  NewAnchorPRSupportResource,
} from "../../../entities";
import { getTimeWindowStart, type TimeWindow } from "../../pr-core/services/time-window.service";

const BOOKING_DEADLINE_RULE_PATTERN = /^T-(\d+)([mhd])$/i;

const resolveBookingDeadlineAt = (
  bookingDeadlineRule: string | null | undefined,
  timeWindow: TimeWindow,
): Date | null => {
  if (!bookingDeadlineRule) return null;

  const trimmed = bookingDeadlineRule.trim();
  if (!trimmed) return null;

  const absolute = new Date(trimmed);
  if (!Number.isNaN(absolute.getTime())) {
    return absolute;
  }

  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;

  const match = trimmed.match(BOOKING_DEADLINE_RULE_PATTERN);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let offsetMs = 0;
  if (unit === "m") offsetMs = amount * 60 * 1000;
  if (unit === "h") offsetMs = amount * 60 * 60 * 1000;
  if (unit === "d") offsetMs = amount * 24 * 60 * 60 * 1000;
  if (offsetMs <= 0) return null;

  return new Date(start.getTime() - offsetMs);
};

const matchesLocation = (
  resource: AnchorEventSupportResource,
  location: string | null,
): boolean => {
  if (resource.appliesToAllLocations) return true;
  if (!location) return false;
  return resource.locationIds.includes(location);
};

const normalizeDetailRules = (
  overrideRules: string[] | null | undefined,
  fallbackRules: string[],
): string[] =>
  overrideRules && overrideRules.length > 0 ? [...overrideRules] : [...fallbackRules];

export interface ResolveSupportTemplatesInput {
  eventResources: AnchorEventSupportResource[];
  batchOverrides: AnchorEventBatchSupportOverride[];
  prId: number;
  location: string | null;
  timeWindow: TimeWindow;
}

export const resolveSupportResourceTemplates = ({
  eventResources,
  batchOverrides,
  prId,
  location,
  timeWindow,
}: ResolveSupportTemplatesInput): NewAnchorPRSupportResource[] => {
  const overridesByResourceId = new Map<number, AnchorEventBatchSupportOverride>();
  for (const override of batchOverrides) {
    overridesByResourceId.set(override.eventSupportResourceId, override);
  }

  const resolved: NewAnchorPRSupportResource[] = [];

  for (const resource of eventResources) {
    if (!matchesLocation(resource, location)) continue;
    const override = overridesByResourceId.get(resource.id);
    if (override?.disabled) continue;

    const bookingRequired =
      override?.bookingRequiredOverride ?? resource.bookingRequired;
    const bookingDeadlineRule =
      override?.bookingDeadlineRuleOverride ?? resource.bookingDeadlineRule;

    resolved.push({
      prId,
      sourceEventSupportResourceId: resource.id,
      sourceBatchSupportOverrideId: override?.id ?? null,
      title: override?.titleOverride ?? resource.title,
      resourceKind: override?.resourceKindOverride ?? resource.resourceKind,
      bookingRequired,
      bookingHandledBy:
        bookingRequired
          ? (override?.bookingHandledByOverride ?? resource.bookingHandledBy ?? null)
          : null,
      bookingDeadlineAt: bookingRequired
        ? resolveBookingDeadlineAt(bookingDeadlineRule, timeWindow)
        : null,
      bookingLocksParticipant:
        override?.bookingLocksParticipantOverride ??
        resource.bookingLocksParticipant,
      cancellationPolicy:
        override?.cancellationPolicyOverride ?? resource.cancellationPolicy ?? null,
      settlementMode:
        override?.settlementModeOverride ?? resource.settlementMode,
      subsidyRate: override?.subsidyRateOverride ?? resource.subsidyRate ?? null,
      subsidyCap: override?.subsidyCapOverride ?? resource.subsidyCap ?? null,
      requiresUserTransferToPlatform:
        override?.requiresUserTransferToPlatformOverride ??
        resource.requiresUserTransferToPlatform,
      summaryText: override?.summaryTextOverride ?? resource.summaryText,
      detailRules: normalizeDetailRules(
        override?.detailRulesOverride,
        resource.detailRules,
      ),
      displayOrder: override?.displayOrderOverride ?? resource.displayOrder,
    });
  }

  return resolved.sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.title.localeCompare(b.title),
  );
};
