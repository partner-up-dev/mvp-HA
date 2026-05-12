import type { AnchorEventLandingMode } from "@/domains/event/model/anchorEventLandingModeStorage";
import {
  ensureUserTelemetrySegment,
  type UserTelemetrySegment,
} from "@/shared/telemetry/journey";
import { resolveCurrentSpmAttribution } from "@/shared/telemetry/spm-attribution";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";

export type AnchorEventFunnelContext = {
  eventId: number;
  assignedMode?: AnchorEventLandingMode;
  renderedMode: AnchorEventLandingMode;
  assignmentRevision?: string;
  isTimeoutFallback?: boolean;
  activityType?: string;
};

export const buildAnchorEventFunnelPayload = (
  context: AnchorEventFunnelContext,
) => ({
  eventId: context.eventId,
  activityType: context.activityType,
  assignedMode: context.assignedMode,
  renderedMode: context.renderedMode,
  assignmentRevision: context.assignmentRevision,
  isTimeoutFallback: context.isTimeoutFallback,
});

const getCurrentRoutePath = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return sanitizeSensitiveRoutePath(
    `${window.location.pathname}${window.location.search}`,
  );
};

export const ensureAnchorEventLandingSegment = (
  context: AnchorEventFunnelContext,
): UserTelemetrySegment => {
  const currentSpm = resolveCurrentSpmAttribution();
  return ensureUserTelemetrySegment({
    segmentKind: "anchor_event_landing",
    eventId: context.eventId,
    assignedMode: context.assignedMode,
    renderedMode: context.renderedMode,
    assignmentRevision: context.assignmentRevision,
    segmentStartRoute: getCurrentRoutePath(),
    segmentStartSpm: currentSpm,
    segmentStartSourceQr: currentSpm,
  });
};
