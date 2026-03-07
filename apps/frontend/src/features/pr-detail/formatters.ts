const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const normalizeTimeValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
};

export const formatPRDate = (value: string, locale: string): string =>
  new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatPRDateTime = (
  value: string | null | undefined,
  locale: string,
): string | null => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return null;

  if (ISO_DATE_ONLY_PATTERN.test(normalized)) {
    const dateOnly = parseIsoDateOnlyAsLocalDate(normalized);
    if (!dateOnly) return value ?? null;
    return dateOnly.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value ?? null;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPRTimeWindow = (
  timeWindow: [string | null, string | null],
  locale: string,
): [string | null, string | null] => [
  formatPRDateTime(timeWindow[0], locale),
  formatPRDateTime(timeWindow[1], locale),
];

export const formatBatchTimeWindowLabel = (
  timeWindow: [string | null, string | null],
  locale: string,
  unknownLabel: string,
): string => {
  const [start, end] = timeWindow;
  const startText = formatPRDateTime(start, locale) ?? unknownLabel;
  const endText = formatPRDateTime(end, locale);
  return endText ? `${startText} - ${endText}` : startText;
};
