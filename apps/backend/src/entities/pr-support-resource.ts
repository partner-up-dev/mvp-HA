import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { partnerRequests, type PRId } from "./partner-request";
import {
  bookingHandledBySchema,
  supportSettlementModeSchema,
  supportResourceKindSchema,
  type BookingHandledBy,
  type SupportResourceKind,
  type SupportSettlementMode,
} from "./anchor-event-support-resource";
import {
  anchorEventSupportResources,
  type AnchorEventSupportResourceId,
} from "./anchor-event-support-resource";
import {
  prJoinGateConfigSchema,
  type PRJoinGateConfig,
} from "./join-gate";

export const prSupportResources = pgTable(
  "pr_support_resources",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    sourceEventSupportResourceId: bigint("source_event_support_resource_id", {
      mode: "number",
    })
      .$type<AnchorEventSupportResourceId | null>()
      .references(() => anchorEventSupportResources.id, {
        onDelete: "set null",
      }),
    title: text("title").notNull(),
    resourceKind: text("resource_kind")
      .$type<SupportResourceKind>()
      .notNull(),
    bookingRequired: boolean("booking_required").notNull().default(false),
    bookingHandledBy: text("booking_handled_by").$type<BookingHandledBy | null>(),
    bookingDeadlineAt: timestamp("booking_deadline_at", {
      withTimezone: true,
    }),
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
    joinGateConfig: jsonb("join_gate_config")
      .$type<PRJoinGateConfig>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    prOrderIdx: index("pr_support_resources_pr_order_idx").on(
      table.prId,
      table.displayOrder,
      table.id,
    ),
  }),
);

export const insertPRSupportResourceSchema = createInsertSchema(
  prSupportResources,
  {
    resourceKind: supportResourceKindSchema,
    bookingHandledBy: bookingHandledBySchema.nullable(),
    settlementMode: supportSettlementModeSchema,
    joinGateConfig: prJoinGateConfigSchema.optional(),
  },
);

export const selectPRSupportResourceSchema = createSelectSchema(
  prSupportResources,
  {
    resourceKind: supportResourceKindSchema,
    bookingHandledBy: bookingHandledBySchema.nullable(),
    settlementMode: supportSettlementModeSchema,
    joinGateConfig: prJoinGateConfigSchema,
  },
);

export type PRSupportResource = typeof prSupportResources.$inferSelect;
export type NewPRSupportResource =
  typeof prSupportResources.$inferInsert;
