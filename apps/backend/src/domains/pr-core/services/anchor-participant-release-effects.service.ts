import type { PRId, UserId } from "../../../entities";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { resolveBookingContactState } from "../../pr-booking-support";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const bookingContactRepo = new AnchorPRBookingContactRepository();

export type AnchorParticipantReleaseEffects = {
  creatorTransferredToUserId: UserId | null;
  creatorTransferApplied: boolean;
  bookingContactCleared: boolean;
};

export const applyAnchorParticipantReleaseEffects = async (input: {
  prId: PRId;
  releasedUserIds: UserId[];
}): Promise<AnchorParticipantReleaseEffects> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return {
      creatorTransferredToUserId: null,
      creatorTransferApplied: false,
      bookingContactCleared: false,
    };
  }

  let creatorTransferredToUserId = request.createdBy ?? null;
  let creatorTransferApplied = false;
  if (request.createdBy && input.releasedUserIds.includes(request.createdBy)) {
    const activeParticipants =
      await partnerRepo.listActiveParticipantSummariesByPrId(input.prId);
    const successor = activeParticipants[0] ?? null;
    creatorTransferredToUserId = successor?.userId ?? null;
    await prRepo.setCreatedBy(input.prId, creatorTransferredToUserId);
    creatorTransferApplied = true;
  }

  const existingBookingContact = await bookingContactRepo.findByPrId(input.prId);
  await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: null,
  });
  const latestBookingContact = await bookingContactRepo.findByPrId(input.prId);

  return {
    creatorTransferredToUserId,
    creatorTransferApplied,
    bookingContactCleared:
      existingBookingContact !== null && latestBookingContact === null,
  };
};
