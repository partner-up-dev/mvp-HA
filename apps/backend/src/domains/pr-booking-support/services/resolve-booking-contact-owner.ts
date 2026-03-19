import type { PRId, UserId } from "../../../entities";
import { PartnerRepository } from "../../../repositories/PartnerRepository";

const partnerRepo = new PartnerRepository();

export type BookingContactOwnerCandidate = {
  partnerId: number;
  userId: UserId;
};

export const resolveBookingContactOwner = async (
  prId: PRId,
): Promise<BookingContactOwnerCandidate | null> => {
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    prId,
  );

  for (const participant of activeParticipants) {
    if (!participant.userId) continue;
    return {
      partnerId: participant.partnerId,
      userId: participant.userId,
    };
  }

  return null;
};
