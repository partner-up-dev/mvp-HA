import { HTTPException } from "hono/http-exception";
import type { PRId, UserId } from "../../../entities";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { normalizeMainlandChinaMobilePhone } from "../services/phone-input";
import { resolveBookingContactState } from "../services/resolve-booking-contact-state";

const bookingContactRepo = new AnchorPRBookingContactRepository();
const BOOKING_CONTACT_PHONE_REQUIRED_CODE = "BOOKING_CONTACT_PHONE_REQUIRED";
const BOOKING_CONTACT_PHONE_INVALID_CODE = "BOOKING_CONTACT_PHONE_INVALID";

type CodedHttpException = HTTPException & {
  code?: string;
};

const throwCodedHttpException = (
  status: 400 | 401 | 403 | 404 | 409 | 500,
  message: string,
  code: string,
): never => {
  const error = new HTTPException(status, { message }) as CodedHttpException;
  error.code = code;
  throw error;
};

const resolvePhoneInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return throwCodedHttpException(
      400,
      "Phone is required",
      BOOKING_CONTACT_PHONE_REQUIRED_CODE,
    );
  }

  const normalized = normalizeMainlandChinaMobilePhone(trimmed);
  if (!normalized) {
    return throwCodedHttpException(
      400,
      "Phone must match mainland China mobile format (11 digits, starts with 1)",
      BOOKING_CONTACT_PHONE_INVALID_CODE,
    );
  }

  return normalized;
};

export async function updateAnchorPRBookingContactPhone(input: {
  prId: PRId;
  userId: UserId;
  phone: string;
}): Promise<{
  bookingContact: Awaited<ReturnType<typeof resolveBookingContactState>>;
}> {
  const state = await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: input.userId,
  });

  if (!state.required) {
    throw new HTTPException(400, {
      message: "Booking contact is not required for this anchor PR",
    });
  }

  if (!state.ownerIsCurrentViewer || !state.ownerPartnerId) {
    throw new HTTPException(403, {
      message: "Only the booking contact owner can update phone",
    });
  }

  const normalizedPhone = resolvePhoneInput(input.phone);

  await bookingContactRepo.upsertByPrId({
    prId: input.prId,
    ownerPartnerId: state.ownerPartnerId,
    ownerUserId: input.userId,
    phoneE164: normalizedPhone.phoneE164,
    phoneMasked: normalizedPhone.phoneMasked,
    verifiedSource: "PHONE_INPUT_FORM",
  });

  const latest = await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: input.userId,
  });

  return {
    bookingContact: latest,
  };
}
