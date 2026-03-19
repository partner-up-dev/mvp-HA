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
import {
  anchorEventBatches,
  type AnchorEventBatchId,
} from "./anchor-event-batch";
import {
  anchorEventSupportResources,
  bookingHandledBySchema,
  supportSettlementModeSchema,
  supportResourceKindSchema,
  type AnchorEventSupportResourceId,
  type BookingHandledBy,
  type SupportResourceKind,
  type SupportSettlementMode,
} from "./anchor-event-support-resource";

export const anchorEventBatchSupportOverrides = pgTable(
  "anchor_event_batch_support_overrides",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    batchId: bigint("batch_id", { mode: "number" })
      .$type<AnchorEventBatchId>()
      .notNull()
      .references(() => anchorEventBatches.id, { onDelete: "cascade" }),
    eventSupportResourceId: bigint("event_support_resource_id", {
      mode: "number",
    })
      .$type<AnchorEventSupportResourceId>()
      .notNull()
      .references(() => anchorEventSupportResources.id, { onDelete: "cascade" }),
    disabled: boolean("disabled").notNull().default(false),
    titleOverride: text("title_override"),
    resourceKindOverride: text("resource_kind_override").$type<
      SupportResourceKind | null
    >(),
    bookingRequiredOverride: boolean("booking_required_override"),
    bookingHandledByOverride: text("booking_handled_by_override").$type<
      BookingHandledBy | null
    >(),
    bookingDeadlineRuleOverride: text("booking_deadline_rule_override"),
    bookingLocksParticipantOverride: boolean(
      "booking_locks_participant_override",
    ),
    cancellationPolicyOverride: text("cancellation_policy_override"),
    settlementModeOverride: text("settlement_mode_override").$type<
      SupportSettlementMode | null
    >(),
    subsidyRateOverride: doublePrecision("subsidy_rate_override"),
    subsidyCapOverride: integer("subsidy_cap_override"),
    requiresUserTransferToPlatformOverride: boolean(
      "requires_user_transfer_to_platform_override",
    ),
    summaryTextOverride: text("summary_text_override"),
    detailRulesOverride: text("detail_rules_override")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    displayOrderOverride: integer("display_order_override"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    batchEventSupportUnique: unique(
      "anchor_event_batch_support_overrides_batch_resource_uq",
    ).on(table.batchId, table.eventSupportResourceId),
  }),
);

export const insertAnchorEventBatchSupportOverrideSchema = createInsertSchema(
  anchorEventBatchSupportOverrides,
  {
    resourceKindOverride: supportResourceKindSchema.nullable(),
    bookingHandledByOverride: bookingHandledBySchema.nullable(),
    settlementModeOverride: supportSettlementModeSchema.nullable(),
  },
);

export const selectAnchorEventBatchSupportOverrideSchema = createSelectSchema(
  anchorEventBatchSupportOverrides,
  {
    resourceKindOverride: supportResourceKindSchema.nullable(),
    bookingHandledByOverride: bookingHandledBySchema.nullable(),
    settlementModeOverride: supportSettlementModeSchema.nullable(),
  },
);

export type AnchorEventBatchSupportOverride =
  typeof anchorEventBatchSupportOverrides.$inferSelect;
export type NewAnchorEventBatchSupportOverride =
  typeof anchorEventBatchSupportOverrides.$inferInsert;
export type AnchorEventBatchSupportOverrideId =
  AnchorEventBatchSupportOverride["id"];
