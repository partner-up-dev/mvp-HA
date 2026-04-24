import type { PRSupportResource, PRId } from "../../../entities";
import { PRSupportResourceRepository } from "../../../repositories/PRSupportResourceRepository";
import { requiresBookingContactForHandledBy } from "./booking-handling.service";

const prSupportRepo = new PRSupportResourceRepository();

export const isBookingContactRequiredFromResources = (
  resources: PRSupportResource[],
): boolean =>
  resources.some(
    (row) =>
      row.bookingRequired &&
      requiresBookingContactForHandledBy(row.bookingHandledBy),
  );

export const isBookingContactRequiredForPR = async (
  prId: PRId,
): Promise<boolean> => {
  const resources = await prSupportRepo.findByPrId(prId);
  return isBookingContactRequiredFromResources(resources);
};
