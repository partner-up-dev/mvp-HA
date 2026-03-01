import {
  bigint,
  boolean,
  bigserial,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { type UserId, users } from "./user";
import { type PRId, partnerRequests } from "./partner-request";

export const partnerIdSchema = z.number().int().positive();

export type PartnerId = z.infer<typeof partnerIdSchema>;

export const partnerStatusSchema = z.enum([
  "JOINED",
  "CONFIRMED",
  "RELEASED",
  "ATTENDED",
]);
export type PartnerStatus = z.infer<typeof partnerStatusSchema>;

export const partnerPaymentStatusSchema = z.enum([
  "NONE",
  "PENDING",
  "PAID",
  "FAILED",
]);
export type PartnerPaymentStatus = z.infer<typeof partnerPaymentStatusSchema>;

export const reimbursementStatusSchema = z.enum([
  "NONE",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAID",
]);
export type ReimbursementStatus = z.infer<typeof reimbursementStatusSchema>;

export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).$type<PartnerId>().primaryKey(),
  prId: bigint("pr_id", { mode: "number" })
    .$type<PRId>()
    .notNull()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  status: text("status").$type<PartnerStatus>().notNull().default("RELEASED"),
  userId: text("user_id")
    .$type<UserId | null>()
    .references(() => users.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at"),
  releasedAt: timestamp("released_at"),
  attendedAt: timestamp("attended_at"),
  checkInAt: timestamp("check_in_at"),
  didAttend: boolean("did_attend"),
  wouldJoinAgain: boolean("would_join_again"),
  paymentStatus: text("payment_status")
    .$type<PartnerPaymentStatus>()
    .notNull()
    .default("NONE"),
  reimbursementRequested: boolean("reimbursement_requested")
    .notNull()
    .default(false),
  reimbursementStatus: text("reimbursement_status")
    .$type<ReimbursementStatus>()
    .notNull()
    .default("NONE"),
  reimbursementAmount: bigint("reimbursement_amount", { mode: "number" }),
  reimbursementRequestedAt: timestamp("reimbursement_requested_at"),
  reimbursementReviewedAt: timestamp("reimbursement_reviewed_at"),
  reimbursementPaidAt: timestamp("reimbursement_paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners);
export const selectPartnerSchema = createSelectSchema(partners);

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
