import type { TimeWindowEntry } from "../../../entities/anchor-event";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";

const parseTime = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
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

export const isBatchDiscoverableAt = (
  batch: Pick<AnchorEventBatch, "timeWindow" | "earliestLeadMinutes">,
  now: Date = new Date(),
): boolean => {
  const earliestLeadMinutes = batch.earliestLeadMinutes ?? null;
  if (earliestLeadMinutes === null) {
    return true;
  }

  const endAt = parseTime(batch.timeWindow[1]);
  if (endAt === null) {
    return true;
  }

  const discoverableBoundary = now.getTime() + earliestLeadMinutes * 60 * 1000;
  return endAt <= discoverableBoundary;
};

export const listDiscoverableAnchorEventBatches = (
  batches: AnchorEventBatch[],
  now: Date = new Date(),
): AnchorEventBatch[] =>
  [...batches]
    .filter((batch) => isBatchDiscoverableAt(batch, now))
    .sort((left, right) => compareTimeWindow(left.timeWindow, right.timeWindow));

export const buildAnchorEventTimeWindowPoolFromBatches = (
  batches: AnchorEventBatch[],
): TimeWindowEntry[] =>
  [...batches]
    .map((batch) => [batch.timeWindow[0], batch.timeWindow[1]] as TimeWindowEntry)
    .sort(compareTimeWindow);

export const buildDiscoverableTimeWindowPoolFromBatches = (
  batches: AnchorEventBatch[],
  now: Date = new Date(),
): TimeWindowEntry[] => {
  const unique = new Map<string, TimeWindowEntry>();

  for (const batch of listDiscoverableAnchorEventBatches(batches, now)) {
    const timeWindow: TimeWindowEntry = [batch.timeWindow[0], batch.timeWindow[1]];
    unique.set(buildTimeWindowKey(timeWindow), timeWindow);
  }

  return Array.from(unique.values()).sort(compareTimeWindow);
};
