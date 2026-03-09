import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const anchorEventStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type AnchorEventStatus = z.infer<typeof anchorEventStatusSchema>;

/** A location entry in the pool: POI.id */
export const locationEntrySchema = z.string().min(1);
export type LocationEntry = z.infer<typeof locationEntrySchema>;

type LegacyLocationEntry = {
  id?: unknown;
  key?: unknown;
  label?: unknown;
};

const normalizeLocationString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLocationValue = (value: unknown): string | null => {
  const direct = normalizeLocationString(value);
  if (direct) {
    return direct;
  }

  if (typeof value === "object" && value !== null) {
    const entry = value as LegacyLocationEntry;
    const id = normalizeLocationString(entry.id);
    if (id) return id;
    const key = normalizeLocationString(entry.key);
    if (key) return key;
    const label = normalizeLocationString(entry.label);
    if (label) return label;
  }

  return null;
};

export const normalizeLocationPool = (rawPool: unknown): LocationEntry[] => {
  if (!Array.isArray(rawPool)) {
    return [];
  }

  const unique = new Set<LocationEntry>();
  for (const item of rawPool) {
    const normalized = normalizeLocationValue(item);
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};

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
