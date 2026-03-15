export interface LocalDateTimeFormatOptions {
  includeDate?: boolean;
  includeTime?: boolean;
}

type DateLike = Date | string | null | undefined;
type TimeWindow = [string | null, string | null];

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const parseIsoDateOnlyAsLocalDate = (value: string): Date | null => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeDateLike = (value: DateLike): Date | string | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") {
    return null;
  }

  if (ISO_DATE_ONLY_PATTERN.test(trimmed)) {
    return parseIsoDateOnlyAsLocalDate(trimmed) ?? trimmed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed;
};

export const formatLocalDateTime = (
  date: Date,
  options: LocalDateTimeFormatOptions = {},
): string => {
  const includeDate = options.includeDate ?? true;
  const includeTime = options.includeTime ?? true;

  if (!includeDate && !includeTime) {
    return "";
  }

  const datePart = [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
  const timePart = [pad2(date.getHours()), pad2(date.getMinutes())].join(":");

  if (includeDate && includeTime) {
    return `${datePart} ${timePart}`;
  }

  return includeDate ? datePart : timePart;
};

export const formatLocalDateTimeValue = (
  value: DateLike,
  options: LocalDateTimeFormatOptions = {},
): string | null => {
  const normalized = normalizeDateLike(value);
  if (normalized === null) {
    return null;
  }

  if (typeof normalized === "string") {
    return normalized;
  }

  return formatLocalDateTime(normalized, options);
};

export const formatLocalDateTimeWindow = (
  timeWindow: TimeWindow,
  options: LocalDateTimeFormatOptions = {},
): [string | null, string | null] => [
  formatLocalDateTimeValue(timeWindow[0], options),
  formatLocalDateTimeValue(timeWindow[1], options),
];

export const formatLocalDateTimeWindowLabel = (
  timeWindow: TimeWindow,
  options: LocalDateTimeFormatOptions = {},
  unknownLabel = "",
): string => {
  const [start, end] = formatLocalDateTimeWindow(timeWindow, options);
  const startText = start ?? unknownLabel;
  if (!end) {
    return startText;
  }
  return `${startText} - ${end}`;
};
