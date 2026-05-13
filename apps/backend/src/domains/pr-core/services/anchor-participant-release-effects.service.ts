import type { PRId, UserId } from "../../../entities";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../../repositories/UserRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

export type AnchorParticipantReleaseEffects = {
  creatorTransferredToUserId: UserId | null;
  creatorTransferApplied: boolean;
  bookingContactCleared: boolean;
};

export const applyAnchorParticipantReleaseEffects = async (input: {
  prId: PRId;
  releasedUserIds: UserId[];
  bookingContactOwnerUserIdToClear?: UserId | null;
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

  let bookingContactCleared = false;
  const bookingContactOwnerUserIdToClear =
    input.bookingContactOwnerUserIdToClear ?? null;
  if (
    bookingContactOwnerUserIdToClear &&
    input.releasedUserIds.includes(bookingContactOwnerUserIdToClear)
  ) {
    const owner = await userRepo.findById(bookingContactOwnerUserIdToClear);
    if (owner?.phoneNumber) {
      await userRepo.updatePhoneNumber(bookingContactOwnerUserIdToClear, null);
      bookingContactCleared = true;
    }
  }

  return {
    creatorTransferredToUserId,
    creatorTransferApplied,
    bookingContactCleared,
  };
};
