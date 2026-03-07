import {
  bigint,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  anchorEvents,
  type AnchorEventId,
} from "./anchor-event";
import {
  anchorEventBatches,
  type AnchorEventBatchId,
} from "./anchor-event-batch";
import {
  economicPolicyScopeSchema,
  partnerRequests,
  paymentModelSchema,
  type EconomicPolicyScope,
  type PaymentModel,
  type PRId,
  visibilityStatusSchema,
  type VisibilityStatus,
} from "./partner-request";

export const anchorPartnerRequests = pgTable("anchor_partner_requests", {
  prId: bigint("pr_id", { mode: "number" })
    .$type<PRId>()
    .primaryKey()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  anchorEventId: bigint("anchor_event_id", { mode: "number" })
    .$type<AnchorEventId>()
    .notNull()
    .references(() => anchorEvents.id, { onDelete: "cascade" }),
  batchId: bigint("batch_id", { mode: "number" })
    .$type<AnchorEventBatchId>()
    .notNull()
    .references(() => anchorEventBatches.id, { onDelete: "cascade" }),
  visibilityStatus: text("visibility_status")
    .$type<VisibilityStatus>()
    .notNull()
    .default("VISIBLE"),
  autoHideAt: timestamp("auto_hide_at"),
  resourceBookingDeadlineAt: timestamp("resource_booking_deadline_at"),
  paymentModelApplied: text("payment_model_applied").$type<PaymentModel | null>(),
  discountRateApplied: doublePrecision("discount_rate_applied"),
  subsidyCapApplied: integer("subsidy_cap_applied"),
  cancellationPolicyApplied: text("cancellation_policy_applied"),
  economicPolicyScopeApplied: text("economic_policy_scope_applied").$type<
    EconomicPolicyScope | null
  >(),
  economicPolicyVersionApplied: integer("economic_policy_version_applied"),
});

export const insertAnchorPartnerRequestSchema = createInsertSchema(
  anchorPartnerRequests,
  {
    visibilityStatus: visibilityStatusSchema,
    paymentModelApplied: paymentModelSchema.nullable(),
    economicPolicyScopeApplied: economicPolicyScopeSchema.nullable(),
  },
);

export const selectAnchorPartnerRequestSchema = createSelectSchema(
  anchorPartnerRequests,
  {
    visibilityStatus: visibilityStatusSchema,
    paymentModelApplied: paymentModelSchema.nullable(),
    economicPolicyScopeApplied: economicPolicyScopeSchema.nullable(),
  },
);

export type AnchorPartnerRequest = typeof anchorPartnerRequests.$inferSelect;
export type NewAnchorPartnerRequest = typeof anchorPartnerRequests.$inferInsert;

