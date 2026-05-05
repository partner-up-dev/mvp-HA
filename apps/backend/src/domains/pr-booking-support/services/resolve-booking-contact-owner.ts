import type { PartnerId, PRId, UserId } from "../../../entities";
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

export const resolveBookingContactOwnerByPartner = async (params: {
  prId: PRId;
  partnerId: PartnerId;
}): Promise<BookingContactOwnerCandidate | null> => {
  const participant = await partnerRepo.findActiveParticipantSummaryByPrIdAndPartnerId(
    params.prId,
    params.partnerId,
  );
  if (!participant?.userId) {
    return null;
  }

  return {
    partnerId: participant.partnerId,
    userId: participant.userId,
  };
};
