import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prBookingContacts,
  type PRBookingContact,
  type BookingContactVerifiedSource,
  type PRId,
  type PartnerId,
  type UserId,
} from "../entities";

export type UpsertPRBookingContactInput = {
  prId: PRId;
  ownerPartnerId: PartnerId;
  ownerUserId: UserId;
  phoneE164: string;
  phoneMasked: string;
  verifiedSource?: BookingContactVerifiedSource;
};

export class PRBookingContactRepository {
  async findByPrId(prId: PRId): Promise<PRBookingContact | null> {
    const result = await db
      .select()
      .from(prBookingContacts)
      .where(eq(prBookingContacts.prId, prId));
    return result[0] ?? null;
  }

  async upsertByPrId(
    input: UpsertPRBookingContactInput,
  ): Promise<PRBookingContact | null> {
    const now = new Date();
    const verifiedSource = input.verifiedSource ?? "PHONE_INPUT_FORM";

    const result = await db
      .insert(prBookingContacts)
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
        target: prBookingContacts.prId,
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
      .delete(prBookingContacts)
      .where(eq(prBookingContacts.prId, prId));
  }
}
