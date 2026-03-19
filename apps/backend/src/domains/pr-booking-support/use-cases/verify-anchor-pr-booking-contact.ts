import { HTTPException } from "hono/http-exception";
import type { PRId, UserId } from "../../../entities";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { WeChatPhoneService } from "../../../services/WeChatPhoneService";
import { resolveBookingContactState } from "../services/resolve-booking-contact-state";

const bookingContactRepo = new AnchorPRBookingContactRepository();
const weChatPhoneService = new WeChatPhoneService();

export async function verifyAnchorPRBookingContact(input: {
  prId: PRId;
  userId: UserId;
  wechatPhoneCredential: string;
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
      message: "Only the booking contact owner can verify phone",
    });
  }

  let phone: { phoneE164: string; phoneMasked: string };
  try {
    phone = await weChatPhoneService.resolvePhoneFromCredential(
      input.wechatPhoneCredential,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to resolve phone from WeChat";
    const codedError = new HTTPException(400, {
      message,
    }) as HTTPException & { code?: string };
    codedError.code = "WECHAT_PHONE_VERIFY_FAILED";
    throw codedError;
  }

  await bookingContactRepo.upsertByPrId({
    prId: input.prId,
    ownerPartnerId: state.ownerPartnerId,
    ownerUserId: input.userId,
    phoneE164: phone.phoneE164,
    phoneMasked: phone.phoneMasked,
  });

  const latest = await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: input.userId,
  });

  return {
    bookingContact: latest,
  };
}
