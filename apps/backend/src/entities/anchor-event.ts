import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
  doublePrecision,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const anchorEventStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type AnchorEventStatus = z.infer<typeof anchorEventStatusSchema>;

export const anchorEventPaymentModelSchema = z.enum(["A", "C"]);
export type AnchorEventPaymentModel = z.infer<
  typeof anchorEventPaymentModelSchema
>;

/** A location entry in the pool: identifier + optional display label */
export const locationEntrySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});
export type LocationEntry = z.infer<typeof locationEntrySchema>;

/** A time-window entry: [start, end] in the same format PR uses (ISO date or datetime, nullable) */
export const timeWindowEntrySchema = z.tuple([
  z.string().nullable(),
  z.string().nullable(),
]);
export type TimeWindowEntry = z.infer<typeof timeWindowEntrySchema>;

// ---------------------------------------------------------------------------
// Drizzle table
// ---------------------------------------------------------------------------

export const anchorEvents = pgTable("anchor_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  locationPool: jsonb("location_pool").$type<LocationEntry[]>().notNull(),
  timeWindowPool: jsonb("time_window_pool")
    .$type<TimeWindowEntry[]>()
    .notNull(),
  coverImage: text("cover_image"),
  status: text("status").$type<AnchorEventStatus>().notNull().default("ACTIVE"),
  paymentModel: text("payment_model")
    .$type<AnchorEventPaymentModel>()
    .notNull()
    .default("C"),
  discountRateDefault: doublePrecision("discount_rate_default"),
  subsidyCapDefault: bigint("subsidy_cap_default", { mode: "number" }),
  resourceBookingDeadlineRule: text("resource_booking_deadline_rule"),
  cancellationPolicy: text("cancellation_policy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Drizzle-Zod
// ---------------------------------------------------------------------------

export const insertAnchorEventSchema = createInsertSchema(anchorEvents);
export const selectAnchorEventSchema = createSelectSchema(anchorEvents);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnchorEvent = typeof anchorEvents.$inferSelect;
export type NewAnchorEvent = typeof anchorEvents.$inferInsert;
export type AnchorEventId = AnchorEvent["id"];
