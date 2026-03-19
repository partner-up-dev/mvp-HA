import type { PRId } from "../../../entities";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";

const prSupportRepo = new AnchorPRSupportResourceRepository();

export async function getEffectiveBookingDeadline(
  prId: PRId,
): Promise<Date | null> {
  const rows = await prSupportRepo.findByPrId(prId);
  let earliest: Date | null = null;

  for (const row of rows) {
    if (!row.bookingRequired || !row.bookingLocksParticipant) continue;
    if (!row.bookingDeadlineAt) continue;
    if (!earliest || row.bookingDeadlineAt.getTime() < earliest.getTime()) {
      earliest = row.bookingDeadlineAt;
    }
  }

  return earliest;
}
