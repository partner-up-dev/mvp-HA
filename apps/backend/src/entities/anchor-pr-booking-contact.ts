import {
  bigint,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { partnerRequests, type PRId } from "./partner-request";
import { partners, type PartnerId } from "./partner";
import { users, type UserId } from "./user";

export const bookingContactVerifiedSourceSchema = z.enum([
  "WECHAT_SERVICE_ACCOUNT",
]);

export type BookingContactVerifiedSource = z.infer<
  typeof bookingContactVerifiedSourceSchema
>;

export const anchorPRBookingContacts = pgTable("anchor_pr_booking_contacts", {
  prId: bigint("pr_id", { mode: "number" })
    .$type<PRId>()
    .primaryKey()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  ownerPartnerId: bigint("owner_partner_id", { mode: "number" })
    .$type<PartnerId>()
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id")
    .$type<UserId>()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  phoneE164: text("phone_e164").notNull(),
  phoneMasked: text("phone_masked").notNull(),
  verifiedSource: text("verified_source")
    .$type<BookingContactVerifiedSource>()
    .notNull()
    .default("WECHAT_SERVICE_ACCOUNT"),
  verifiedAt: timestamp("verified_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAnchorPRBookingContactSchema = createInsertSchema(
  anchorPRBookingContacts,
  {
    verifiedSource: bookingContactVerifiedSourceSchema,
  },
);

export const selectAnchorPRBookingContactSchema = createSelectSchema(
  anchorPRBookingContacts,
  {
    verifiedSource: bookingContactVerifiedSourceSchema,
  },
);

export type AnchorPRBookingContact = typeof anchorPRBookingContacts.$inferSelect;
export type NewAnchorPRBookingContact = typeof anchorPRBookingContacts.$inferInsert;
