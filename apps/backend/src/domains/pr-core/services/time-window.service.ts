/**
 * Time-window domain service — pure functions for PR time-window calculations.
 *
 * These are extracted from the former PartnerRequestService to enable
 * reuse across multiple use-cases without coupling to any specific
 * use-case class.
 */

import type { PartnerRequestFields } from "../../../entities/partner-request";

export type TimeWindow = PartnerRequestFields["time"];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseTimeWindowDate(value: string | null): Date | null {
  if (!value) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const normalized = isDateOnly ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// ---------------------------------------------------------------------------
// Window boundaries
// ---------------------------------------------------------------------------

export function getTimeWindowStart(timeWindow: TimeWindow): Date | null {
  const [startRaw] = timeWindow;
  return parseTimeWindowDate(startRaw);
}

export function getTimeWindowClose(timeWindow: TimeWindow): Date | null {
  const [startRaw, endRaw] = timeWindow;
  const end = parseTimeWindowDate(endRaw);
  if (end) return end;

  const start = parseTimeWindowDate(startRaw);
  if (!start) return null;

  // Default close: 12 hours after start
  return new Date(start.getTime() + 12 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Derived deadlines
// ---------------------------------------------------------------------------

/** T-1h: deadline for unconfirmed slots auto-release. */
export function getConfirmDeadline(timeWindow: TimeWindow): Date | null {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;
  return new Date(start.getTime() - 60 * 60 * 1000);
}

/** T-30min: join lock time — no new participants after this point. */
export function getJoinLockTime(timeWindow: TimeWindow): Date | null {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;
  return new Date(start.getTime() - 30 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Temporal predicates
// ---------------------------------------------------------------------------

/**
 * Between T-1h and T-30min a newly joining partner is auto-confirmed.
 */
export function shouldAutoConfirmImmediately(timeWindow: TimeWindow): boolean {
  const confirmDeadline = getConfirmDeadline(timeWindow);
  const joinLockTime = getJoinLockTime(timeWindow);
  if (!confirmDeadline || !joinLockTime) return false;

  const now = Date.now();
  return now >= confirmDeadline.getTime() && now < joinLockTime.getTime();
}

/** After T-30min no one can join. */
export function isJoinLockedByTime(timeWindow: TimeWindow): boolean {
  const joinLockTime = getJoinLockTime(timeWindow);
  if (!joinLockTime) return false;
  return Date.now() >= joinLockTime.getTime();
}

/** Has the event actually started? */
export function hasEventStarted(timeWindow: TimeWindow): boolean {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return true;
  return Date.now() >= start.getTime();
}

/** Is the current moment inside the active execution window? */
export function isWithinActiveWindow(timeWindow: TimeWindow): boolean {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return false;

  const now = Date.now();
  if (start.getTime() > now) return false;

  const close = getTimeWindowClose(timeWindow);
  if (close && close.getTime() <= now) return false;

  return true;
}

/** Has the resource booking deadline been reached? */
export function isBookingDeadlineReached(
  deadline: Date | string | null | undefined,
): boolean {
  if (!deadline) return false;

  const parsed =
    deadline instanceof Date ? deadline : parseTimeWindowDate(deadline);
  if (!parsed) return false;
  return Date.now() >= parsed.getTime();
}
