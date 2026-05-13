import type { PRId, UserId, PRSupportResource } from "../../../entities";
import { normalizePRJoinGateConfig } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { maskMainlandChinaMobilePhone } from "../../../lib/phone-number";
import { getEffectiveBookingDeadline } from "./get-effective-booking-deadline";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export type BookingContactState = {
  required: boolean;
  state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
  ownerPartnerId: number | null;
  ownerUserId: UserId | null;
  ownerNickname: string | null;
  ownerIsCurrentViewer: boolean;
  fullPhone: string | null;
  maskedPhone: string | null;
  verifiedAt: string | null;
  deadlineAt: string | null;
};

export const resolveBookingContactState = async (params: {
  prId: PRId;
  viewerUserId: UserId | null;
  supportResources?: PRSupportResource[];
  effectiveBookingDeadlineAt?: Date | null;
}): Promise<BookingContactState> => {
  const request = await prRepo.findById(params.prId);
  const required = normalizePRJoinGateConfig(request?.joinGateConfig).some(
    (gate) => gate.kind === "BOOKING_CONTACT",
  );

  if (!required) {
    return {
      required: false,
      state: "NOT_REQUIRED",
      ownerPartnerId: null,
      ownerUserId: null,
      ownerNickname: null,
      ownerIsCurrentViewer: false,
      fullPhone: null,
      maskedPhone: null,
      verifiedAt: null,
      deadlineAt: null,
    };
  }

  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(params.prId);
  const contactOwner =
    activeParticipants.find((participant) => participant.phoneNumber) ?? null;
  const viewerActiveParticipant =
    params.viewerUserId === null
      ? null
      : activeParticipants.find(
          (participant) => participant.userId === params.viewerUserId,
        ) ?? null;
  const viewer = params.viewerUserId
    ? await userRepo.findById(params.viewerUserId)
    : null;
  const viewerHasPhone = Boolean(viewer?.phoneNumber);

  const effectiveBookingDeadlineAt =
    params.effectiveBookingDeadlineAt ??
    (required ? await getEffectiveBookingDeadline(params.prId) : null);

  return {
    required,
    state: contactOwner ? "VERIFIED" : "MISSING",
    ownerPartnerId: contactOwner?.partnerId ?? null,
    ownerUserId: contactOwner?.userId ?? null,
    ownerNickname: contactOwner?.nickname ?? null,
    ownerIsCurrentViewer: Boolean(
      contactOwner
        ? params.viewerUserId === contactOwner.userId
        : viewerActiveParticipant || viewerHasPhone,
    ),
    fullPhone: contactOwner?.phoneNumber ?? null,
    maskedPhone: maskMainlandChinaMobilePhone(contactOwner?.phoneNumber),
    verifiedAt: null,
    deadlineAt: toIsoString(effectiveBookingDeadlineAt),
  };
};
