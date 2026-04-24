import type {
  PRBookingExecution,
  PRBookingExecutionResult,
  PRId,
} from "../../../entities";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  resolveBookingResultStatusLabel,
  scheduleWeChatBookingResultNotifications,
  type BookingResultNotificationSummary,
} from "../../../infra/notifications";
import type { UserId } from "../../../entities/user";

const partnerRepo = new PartnerRepository();

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const formatDateTime = (value: string): string => {
  if (ISO_DATE_ONLY_RE.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const formatActivityTime = (
  timeWindow: [string | null, string | null],
): string => {
  const [startRaw, endRaw] = timeWindow;
  const start = normalizeText(startRaw);
  const end = normalizeText(endRaw);
  if (start && end) {
    return `${formatDateTime(start)} - ${formatDateTime(end)}`;
  }
  if (start) {
    return formatDateTime(start);
  }
  if (end) {
    return formatDateTime(end);
  }
  return "时间待定";
};

const resolveBookingDetail = (input: {
  result: PRBookingExecutionResult;
  reason: string | null;
  resourceSummaryText: string;
  resourceDetailRules: string[];
}): string => {
  const preferred =
    normalizeText(input.reason) ??
    normalizeText(input.resourceSummaryText) ??
    input.resourceDetailRules.map((item) => normalizeText(item)).find(Boolean) ??
    null;

  if (preferred) {
    return preferred;
  }

  return input.result === "SUCCESS"
    ? "平台已完成预订"
    : "平台暂未完成预订";
};

export type { BookingResultNotificationSummary };

export async function sendBookingResultNotifications(input: {
  executionId: PRBookingExecution["id"];
  prId: PRId;
  prTimeWindow: [string | null, string | null];
  location: string | null;
  resourceTitle: string;
  resourceSummaryText: string;
  resourceDetailRules: string[];
  result: PRBookingExecutionResult;
  reason: string | null;
}): Promise<BookingResultNotificationSummary> {
  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(input.prId);
  const recipientUserIds = Array.from(
    new Set<UserId>(activeParticipants.map((participant) => participant.userId)),
  );

  if (recipientUserIds.length === 0) {
    return {
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
    };
  }

  return scheduleWeChatBookingResultNotifications({
    executionId: input.executionId,
    prId: input.prId,
    recipientUserIds,
    bookingItem: input.resourceTitle,
    statusLabel: resolveBookingResultStatusLabel(input.result),
    activityTime: formatActivityTime(input.prTimeWindow),
    address: normalizeText(input.location) ?? "地点待定",
    bookingDetail: resolveBookingDetail({
      result: input.result,
      reason: input.reason,
      resourceSummaryText: input.resourceSummaryText,
      resourceDetailRules: input.resourceDetailRules,
    }),
  });
}
