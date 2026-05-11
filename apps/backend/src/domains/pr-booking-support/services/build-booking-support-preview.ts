import type { PRSupportResource } from "../../../entities";

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export interface BookingSupportPreview {
  headline: string | null;
  highlights: string[];
  effectiveBookingDeadlineAt: string | null;
}

export function buildBookingSupportPreview(
  rows: PRSupportResource[],
): BookingSupportPreview {
  const orderedRows = [...rows].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id,
  );
  const highlights = orderedRows
    .map((row) => row.summaryText.trim())
    .filter((summary) => summary.length > 0)
    .slice(0, 3);

  let effectiveBookingDeadlineAt: Date | null = null;
  for (const row of orderedRows) {
    if (!row.bookingRequired || !row.bookingLocksParticipant) continue;
    if (!row.bookingDeadlineAt) continue;
    if (
      effectiveBookingDeadlineAt === null ||
      row.bookingDeadlineAt.getTime() < effectiveBookingDeadlineAt.getTime()
    ) {
      effectiveBookingDeadlineAt = row.bookingDeadlineAt;
    }
  }

  return {
    headline: highlights[0] ?? null,
    highlights,
    effectiveBookingDeadlineAt: toIsoString(effectiveBookingDeadlineAt),
  };
}
