import type {
  AnchorEvent,
  AnchorEventRecurringStartRule,
  AnchorEventStartRule,
  AnchorEventTimePoolConfig,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import { normalizeAnchorEventTimePoolConfig } from "../../../entities/anchor-event";

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const parseTime = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const toCanonicalIso = (value: Date): string => value.toISOString();

const parseTimeOfDay = (
  value: string,
): { hour: number; minute: number } | null => {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
};

const toProductLocalDate = (value: Date): Date =>
  new Date(value.getTime() + PRODUCT_TIME_ZONE_OFFSET_MS);

const toUtcFromProductLocalParts = (
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  hour: number,
  minute: number,
): Date =>
  new Date(
    Date.UTC(year, monthIndex, dayOfMonth, hour, minute) -
      PRODUCT_TIME_ZONE_OFFSET_MS,
  );

const getProductLocalDayStart = (value: Date): Date => {
  const local = toProductLocalDate(value);
  return toUtcFromProductLocalParts(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
  );
};

const getProductLocalWeekday = (value: Date): number =>
  toProductLocalDate(value).getUTCDay();

const buildRecurringOccurrenceStart = (
  dayStartUtc: Date,
  rule: AnchorEventRecurringStartRule,
): Date | null => {
  const localDay = toProductLocalDate(dayStartUtc);
  const timeOfDay = parseTimeOfDay(rule.timeOfDay);
  if (!timeOfDay) {
    return null;
  }

  return toUtcFromProductLocalParts(
    localDay.getUTCFullYear(),
    localDay.getUTCMonth(),
    localDay.getUTCDate(),
    timeOfDay.hour,
    timeOfDay.minute,
  );
};

const materializeTimeWindow = (
  startAt: Date,
  durationMinutes: number,
): TimeWindowEntry => {
  const endAt = new Date(startAt.getTime() + durationMinutes * MINUTE_MS);
  return [toCanonicalIso(startAt), toCanonicalIso(endAt)];
};

export const compareTimeWindow = (
  left: TimeWindowEntry,
  right: TimeWindowEntry,
): number => {
  const leftStart = left[0] ?? "";
  const rightStart = right[0] ?? "";
  if (leftStart !== rightStart) {
    return leftStart.localeCompare(rightStart);
  }

  const leftEnd = left[1] ?? "";
  const rightEnd = right[1] ?? "";
  return leftEnd.localeCompare(rightEnd);
};

export const buildTimeWindowKey = (timeWindow: TimeWindowEntry): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

const isTimeWindowDiscoverableAt = (
  timeWindow: TimeWindowEntry,
  earliestLeadMinutes: number | null,
  now: Date,
): boolean => {
  const endAt = parseTime(timeWindow[1]);
  if (endAt === null) {
    return false;
  }

  if (earliestLeadMinutes === null) {
    return true;
  }

  return endAt <= now.getTime() + earliestLeadMinutes * MINUTE_MS;
};

const isTimeWindowWithinPreviewLowerBound = (
  timeWindow: TimeWindowEntry,
  previewLowerBound: Date,
): boolean => {
  const endAt = parseTime(timeWindow[1]);
  if (endAt === null) {
    return false;
  }
  return endAt >= previewLowerBound.getTime();
};

const materializeAbsoluteRule = (
  rule: Extract<AnchorEventStartRule, { kind: "ABSOLUTE" }>,
  durationMinutes: number,
): TimeWindowEntry | null => {
  const startAt = new Date(rule.startAt);
  if (Number.isNaN(startAt.getTime())) {
    return null;
  }

  return materializeTimeWindow(startAt, durationMinutes);
};

const materializeRecurringRules = ({
  rule,
  durationMinutes,
  now,
  earliestLeadMinutes,
}: {
  rule: AnchorEventRecurringStartRule;
  durationMinutes: number;
  now: Date;
  earliestLeadMinutes: number | null;
}): TimeWindowEntry[] => {
  if (earliestLeadMinutes === null) {
    return [];
  }

  const boundary = new Date(now.getTime() + earliestLeadMinutes * MINUTE_MS);
  const firstDayStart = getProductLocalDayStart(now);
  const lastDayStart = getProductLocalDayStart(boundary);
  const values: TimeWindowEntry[] = [];

  for (
    let dayStart = firstDayStart;
    dayStart.getTime() <= lastDayStart.getTime();
    dayStart = new Date(dayStart.getTime() + DAY_MS)
  ) {
    const weekday = getProductLocalWeekday(dayStart);
    if (!rule.weekdays.includes(weekday)) {
      continue;
    }

    const startAt = buildRecurringOccurrenceStart(dayStart, rule);
    if (!startAt) {
      continue;
    }

    const timeWindow = materializeTimeWindow(startAt, durationMinutes);
    if (
      isTimeWindowWithinPreviewLowerBound(timeWindow, firstDayStart) &&
      isTimeWindowDiscoverableAt(timeWindow, earliestLeadMinutes, now)
    ) {
      values.push(timeWindow);
    }
  }

  return values;
};

const materializePreviewTimeWindows = (
  config: AnchorEventTimePoolConfig,
  now: Date,
): TimeWindowEntry[] => {
  if (config.durationMinutes === null || config.startRules.length === 0) {
    return [];
  }

  const previewLowerBound = getProductLocalDayStart(now);
  const unique = new Map<string, TimeWindowEntry>();

  for (const rule of config.startRules) {
    if (rule.kind === "ABSOLUTE") {
      const timeWindow = materializeAbsoluteRule(rule, config.durationMinutes);
      if (!timeWindow) {
        continue;
      }
      if (
        !isTimeWindowWithinPreviewLowerBound(timeWindow, previewLowerBound) ||
        !isTimeWindowDiscoverableAt(
          timeWindow,
          config.earliestLeadMinutes,
          now,
        )
      ) {
        continue;
      }
      unique.set(buildTimeWindowKey(timeWindow), timeWindow);
      continue;
    }

    for (const timeWindow of materializeRecurringRules({
      rule,
      durationMinutes: config.durationMinutes,
      now,
      earliestLeadMinutes: config.earliestLeadMinutes,
    })) {
      unique.set(buildTimeWindowKey(timeWindow), timeWindow);
    }
  }

  return Array.from(unique.values()).sort(compareTimeWindow);
};

export const listAnchorEventTimeWindows = (
  event: Pick<AnchorEvent, "timePoolConfig">,
  now: Date = new Date(),
): TimeWindowEntry[] =>
  materializePreviewTimeWindows(
    normalizeAnchorEventTimePoolConfig(event.timePoolConfig),
    now,
  );

export const eventOwnsTimeWindow = (
  event: Pick<AnchorEvent, "timePoolConfig">,
  timeWindow: TimeWindowEntry,
): boolean => {
  const config = normalizeAnchorEventTimePoolConfig(event.timePoolConfig);
  if (config.durationMinutes === null || config.startRules.length === 0) {
    return false;
  }

  const startAtMs = parseTime(timeWindow[0]);
  const endAtMs = parseTime(timeWindow[1]);
  if (startAtMs === null || endAtMs === null) {
    return false;
  }

  const durationMinutes = (endAtMs - startAtMs) / MINUTE_MS;
  if (!Number.isFinite(durationMinutes) || durationMinutes !== config.durationMinutes) {
    return false;
  }

  const candidateStart = new Date(startAtMs);
  const candidateStartIso = toCanonicalIso(candidateStart);
  const localCandidate = toProductLocalDate(candidateStart);
  const candidateWeekday = localCandidate.getUTCDay();
  const candidateTimeOfDay = `${String(localCandidate.getUTCHours()).padStart(
    2,
    "0",
  )}:${String(localCandidate.getUTCMinutes()).padStart(2, "0")}`;

  return config.startRules.some((rule) => {
    if (rule.kind === "ABSOLUTE") {
      return rule.startAt === candidateStartIso;
    }

    return (
      rule.weekdays.includes(candidateWeekday) &&
      rule.timeOfDay === candidateTimeOfDay
    );
  });
};
