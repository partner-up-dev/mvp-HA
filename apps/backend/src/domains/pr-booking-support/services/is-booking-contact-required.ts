import type { PRSupportResource, PRId } from "../../../entities";
import { normalizePRJoinGateConfig } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();

export const isBookingContactRequiredFromResources = (
  resources: PRSupportResource[],
): boolean => resources.some((row) =>
  normalizePRJoinGateConfig(row.joinGateConfig).some(
    (gate) => gate.kind === "BOOKING_CONTACT",
  ),
);

export const isBookingContactRequiredForPR = async (
  prId: PRId,
): Promise<boolean> => {
  const request = await prRepo.findById(prId);
  return normalizePRJoinGateConfig(request?.joinGateConfig).some(
    (gate) => gate.kind === "BOOKING_CONTACT",
  );
};
