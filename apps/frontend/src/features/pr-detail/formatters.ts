import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindow,
  formatLocalDateTimeWindowLabel,
} from "@/lib/datetime";

export const formatPRDate = (value: string, _locale: string): string =>
  formatLocalDateTimeValue(value) ?? value;

export const formatPRDateTime = (
  value: string | null | undefined,
  _locale: string,
): string | null => formatLocalDateTimeValue(value);

export const formatPRTimeWindow = (
  timeWindow: [string | null, string | null],
  _locale: string,
): [string | null, string | null] => formatLocalDateTimeWindow(timeWindow);

export const formatBatchTimeWindowLabel = (
  timeWindow: [string | null, string | null],
  _locale: string,
  unknownLabel: string,
): string =>
  formatLocalDateTimeWindowLabel(timeWindow, {}, unknownLabel);
