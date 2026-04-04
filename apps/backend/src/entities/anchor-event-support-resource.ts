import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { anchorEvents, type AnchorEventId } from "./anchor-event";

export const supportResourceKindSchema = z.enum([
  "VENUE",
  "ITEM",
  "SERVICE",
  "OTHER",
]);
export type SupportResourceKind = z.infer<typeof supportResourceKindSchema>;

export const bookingHandledBySchema = z.enum([
  "PLATFORM",
  "PLATFORM_PASSTHROUGH",
  "USER",
]);
export type BookingHandledBy = z.infer<typeof bookingHandledBySchema>;

export const supportSettlementModeSchema = z.enum([
  "NONE",
  "PLATFORM_PREPAID",
  "PLATFORM_POSTPAID",
]);
export type SupportSettlementMode = z.infer<
  typeof supportSettlementModeSchema
>;

export const anchorEventSupportResources = pgTable(
  "anchor_event_support_resources",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    anchorEventId: bigint("anchor_event_id", { mode: "number" })
      .$type<AnchorEventId>()
      .notNull()
      .references(() => anchorEvents.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    resourceKind: text("resource_kind")
      .$type<SupportResourceKind>()
      .notNull(),
    appliesToAllLocations: boolean("applies_to_all_locations")
      .notNull()
      .default(true),
    locationIds: text("location_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    bookingRequired: boolean("booking_required").notNull().default(false),
    bookingHandledBy: text("booking_handled_by").$type<BookingHandledBy | null>(),
    bookingDeadlineRule: text("booking_deadline_rule"),
    bookingLocksParticipant: boolean("booking_locks_participant")
      .notNull()
      .default(false),
    cancellationPolicy: text("cancellation_policy"),
    settlementMode: text("settlement_mode")
      .$type<SupportSettlementMode>()
      .notNull()
      .default("NONE"),
    subsidyRate: doublePrecision("subsidy_rate"),
    subsidyCap: integer("subsidy_cap"),
    requiresUserTransferToPlatform: boolean(
      "requires_user_transfer_to_platform",
    )
      .notNull()
      .default(false),
    summaryText: text("summary_text").notNull(),
    detailRules: text("detail_rules")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    anchorEventCodeUnique: unique("anchor_event_support_resources_event_code_uq")
      .on(table.anchorEventId, table.code),
  }),
);

export const insertAnchorEventSupportResourceSchema = createInsertSchema(
  anchorEventSupportResources,
  {
    resourceKind: supportResourceKindSchema,
    bookingHandledBy: bookingHandledBySchema.nullable(),
    settlementMode: supportSettlementModeSchema,
  },
);

export const selectAnchorEventSupportResourceSchema = createSelectSchema(
  anchorEventSupportResources,
  {
    resourceKind: supportResourceKindSchema,
    bookingHandledBy: bookingHandledBySchema.nullable(),
    settlementMode: supportSettlementModeSchema,
  },
);

export type AnchorEventSupportResource =
  typeof anchorEventSupportResources.$inferSelect;
export type NewAnchorEventSupportResource =
  typeof anchorEventSupportResources.$inferInsert;
export type AnchorEventSupportResourceId = AnchorEventSupportResource["id"];
