import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorPRBookingContacts,
  type AnchorPRBookingContact,
  type BookingContactVerifiedSource,
  type PRId,
  type PartnerId,
  type UserId,
} from "../entities";

export type UpsertAnchorPRBookingContactInput = {
  prId: PRId;
  ownerPartnerId: PartnerId;
  ownerUserId: UserId;
  phoneE164: string;
  phoneMasked: string;
  verifiedSource?: BookingContactVerifiedSource;
};

export class AnchorPRBookingContactRepository {
  async findByPrId(prId: PRId): Promise<AnchorPRBookingContact | null> {
    const result = await db
      .select()
      .from(anchorPRBookingContacts)
      .where(eq(anchorPRBookingContacts.prId, prId));
    return result[0] ?? null;
  }

  async upsertByPrId(
    input: UpsertAnchorPRBookingContactInput,
  ): Promise<AnchorPRBookingContact | null> {
    const now = new Date();
    const verifiedSource = input.verifiedSource ?? "PHONE_INPUT_FORM";

    const result = await db
      .insert(anchorPRBookingContacts)
      .values({
        prId: input.prId,
        ownerPartnerId: input.ownerPartnerId,
        ownerUserId: input.ownerUserId,
        phoneE164: input.phoneE164,
        phoneMasked: input.phoneMasked,
        verifiedSource,
        verifiedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: anchorPRBookingContacts.prId,
        set: {
          ownerPartnerId: input.ownerPartnerId,
          ownerUserId: input.ownerUserId,
          phoneE164: input.phoneE164,
          phoneMasked: input.phoneMasked,
          verifiedSource,
          verifiedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return result[0] ?? null;
  }

  async deleteByPrId(prId: PRId): Promise<void> {
    await db
      .delete(anchorPRBookingContacts)
      .where(eq(anchorPRBookingContacts.prId, prId));
  }
}
