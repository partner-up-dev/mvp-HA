import type { AnchorPRSupportResource, PRId } from "../../../entities";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";

const prSupportRepo = new AnchorPRSupportResourceRepository();

export const isBookingContactRequiredFromResources = (
  resources: AnchorPRSupportResource[],
): boolean =>
  resources.some(
    (row) => row.bookingRequired && row.bookingHandledBy === "PLATFORM",
  );

export const isBookingContactRequiredForPR = async (
  prId: PRId,
): Promise<boolean> => {
  const resources = await prSupportRepo.findByPrId(prId);
  return isBookingContactRequiredFromResources(resources);
};
