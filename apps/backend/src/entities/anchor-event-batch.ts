import {
  pgTable,
  bigserial,
  bigint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { anchorEvents, type AnchorEventId } from "./anchor-event";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const anchorEventBatchStatusSchema = z.enum(["OPEN", "FULL", "EXPIRED"]);
export type AnchorEventBatchStatus = z.infer<
  typeof anchorEventBatchStatusSchema
>;

// ---------------------------------------------------------------------------
// Drizzle table
// ---------------------------------------------------------------------------

export const anchorEventBatches = pgTable("anchor_event_batches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  anchorEventId: bigint("anchor_event_id", { mode: "number" })
    .$type<AnchorEventId>()
    .notNull()
    .references(() => anchorEvents.id, { onDelete: "cascade" }),
  /** Time window: [start, end] in same format as PR time (ISO date or datetime, nullable) */
  timeWindow: text("time_window")
    .array()
    .$type<[string | null, string | null]>()
    .notNull()
    .default(sql`ARRAY[NULL, NULL]::text[]`),
  status: text("status")
    .$type<AnchorEventBatchStatus>()
    .notNull()
    .default("OPEN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Drizzle-Zod
// ---------------------------------------------------------------------------

export const insertAnchorEventBatchSchema =
  createInsertSchema(anchorEventBatches);
export const selectAnchorEventBatchSchema =
  createSelectSchema(anchorEventBatches);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnchorEventBatch = typeof anchorEventBatches.$inferSelect;
export type NewAnchorEventBatch = typeof anchorEventBatches.$inferInsert;
export type AnchorEventBatchId = AnchorEventBatch["id"];
