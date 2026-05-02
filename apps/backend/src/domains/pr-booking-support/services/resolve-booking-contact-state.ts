import type { PRId, UserId, PRSupportResource } from "../../../entities";
import { normalizePRJoinGateConfig } from "../../../entities";
import { PRBookingContactRepository } from "../../../repositories/PRBookingContactRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { getEffectiveBookingDeadline } from "./get-effective-booking-deadline";
import { resolveBookingContactOwner } from "./resolve-booking-contact-owner";

const bookingContactRepo = new PRBookingContactRepository();
const prRepo = new PartnerRequestRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export type BookingContactState = {
  required: boolean;
  state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
  ownerPartnerId: number | null;
  ownerIsCurrentViewer: boolean;
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
  let contact = await bookingContactRepo.findByPrId(params.prId);

  if (!required && contact) {
    await bookingContactRepo.deleteByPrId(params.prId);
    contact = null;
  }

  if (!required) {
    return {
      required: false,
      state: "NOT_REQUIRED",
      ownerPartnerId: null,
      ownerIsCurrentViewer: false,
      maskedPhone: null,
      verifiedAt: null,
      deadlineAt: null,
    };
  }

  const owner = await resolveBookingContactOwner(params.prId);

  if (
    contact &&
    contact.ownerPartnerId !== null &&
    (!owner ||
      contact.ownerPartnerId !== owner.partnerId ||
      contact.ownerUserId !== owner.userId)
  ) {
    await bookingContactRepo.deleteByPrId(params.prId);
    contact = null;
  }

  if (
    contact &&
    contact.ownerPartnerId === null &&
    owner &&
    contact.ownerUserId !== owner.userId
  ) {
    await bookingContactRepo.deleteByPrId(params.prId);
    contact = null;
  }

  const effectiveBookingDeadlineAt =
    params.effectiveBookingDeadlineAt ??
    (required ? await getEffectiveBookingDeadline(params.prId) : null);

  return {
    required,
    state: !required ? "NOT_REQUIRED" : contact ? "VERIFIED" : "MISSING",
    ownerPartnerId: contact?.ownerPartnerId ?? owner?.partnerId ?? null,
    ownerIsCurrentViewer: Boolean(
      contact
        ? params.viewerUserId === contact.ownerUserId
        : owner && params.viewerUserId === owner.userId,
    ),
    maskedPhone: contact?.phoneMasked ?? null,
    verifiedAt: toIsoString(contact?.verifiedAt),
    deadlineAt: toIsoString(effectiveBookingDeadlineAt),
  };
};
