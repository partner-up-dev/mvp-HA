import type { PRId, UserId, AnchorPRSupportResource } from "../../../entities";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { getEffectiveBookingDeadline } from "./get-effective-booking-deadline";
import { isBookingContactRequiredFromResources } from "./is-booking-contact-required";
import { resolveBookingContactOwner } from "./resolve-booking-contact-owner";

const bookingContactRepo = new AnchorPRBookingContactRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();

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
  supportResources?: AnchorPRSupportResource[];
  effectiveBookingDeadlineAt?: Date | null;
}): Promise<BookingContactState> => {
  const supportResources =
    params.supportResources ?? (await prSupportRepo.findByPrId(params.prId));
  const required = isBookingContactRequiredFromResources(supportResources);
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
    (!owner ||
      contact.ownerPartnerId !== owner.partnerId ||
      contact.ownerUserId !== owner.userId)
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
    ownerPartnerId: owner?.partnerId ?? null,
    ownerIsCurrentViewer: Boolean(owner && params.viewerUserId === owner.userId),
    maskedPhone: contact?.phoneMasked ?? null,
    verifiedAt: toIsoString(contact?.verifiedAt),
    deadlineAt: toIsoString(effectiveBookingDeadlineAt),
  };
};
