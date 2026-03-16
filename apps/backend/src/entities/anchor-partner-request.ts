import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  anchorEvents,
  type AnchorEventId,
} from "./anchor-event";
import {
  anchorEventBatches,
  type AnchorEventBatchId,
} from "./anchor-event-batch";
import {
  partnerRequests,
  type PRId,
  visibilityStatusSchema,
  type VisibilityStatus,
} from "./partner-request";

export const anchorLocationSourceSchema = z.enum(["SYSTEM", "USER"]);
export type AnchorLocationSource = z.infer<typeof anchorLocationSourceSchema>;

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
  locationSource: text("location_source")
    .$type<AnchorLocationSource>()
    .notNull()
    .default("SYSTEM"),
  visibilityStatus: text("visibility_status")
    .$type<VisibilityStatus>()
    .notNull()
    .default("VISIBLE"),
  confirmationStartOffsetMinutes: integer("confirmation_start_offset_minutes")
    .notNull()
    .default(120),
  confirmationEndOffsetMinutes: integer("confirmation_end_offset_minutes")
    .notNull()
    .default(30),
  joinLockOffsetMinutes: integer("join_lock_offset_minutes")
    .notNull()
    .default(30),
  bookingTriggeredAt: timestamp("booking_triggered_at"),
  autoHideAt: timestamp("auto_hide_at"),
});

export const insertAnchorPartnerRequestSchema = createInsertSchema(
  anchorPartnerRequests,
  {
    locationSource: anchorLocationSourceSchema,
    visibilityStatus: visibilityStatusSchema,
  },
);

export const selectAnchorPartnerRequestSchema = createSelectSchema(
  anchorPartnerRequests,
  {
    locationSource: anchorLocationSourceSchema,
    visibilityStatus: visibilityStatusSchema,
  },
);

export type AnchorPartnerRequest = typeof anchorPartnerRequests.$inferSelect;
export type NewAnchorPartnerRequest = typeof anchorPartnerRequests.$inferInsert;
