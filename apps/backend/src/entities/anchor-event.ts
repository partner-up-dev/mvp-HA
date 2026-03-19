import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const anchorEventStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type AnchorEventStatus = z.infer<typeof anchorEventStatusSchema>;

/** A system-managed location entry: POI.id */
export const systemLocationEntrySchema = z.string().min(1);
export type SystemLocationEntry = z.infer<typeof systemLocationEntrySchema>;

/** Backward-compatible alias kept for incremental migration of call sites. */
export const locationEntrySchema = systemLocationEntrySchema;
export type LocationEntry = SystemLocationEntry;

export const userLocationEntrySchema = z.object({
  id: z.string().trim().min(1),
  perBatchCap: z.number().int().positive(),
});
export type UserLocationEntry = z.infer<typeof userLocationEntrySchema>;

type LegacyLocationEntry = {
  id?: unknown;
  key?: unknown;
  label?: unknown;
};

type LegacyUserLocationEntry = {
  id?: unknown;
  locationId?: unknown;
  key?: unknown;
  perBatchCap?: unknown;
  cap?: unknown;
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

export const normalizeSystemLocationPool = (
  rawPool: unknown,
): SystemLocationEntry[] => {
  if (!Array.isArray(rawPool)) {
    return [];
  }

  const unique = new Set<SystemLocationEntry>();
  for (const item of rawPool) {
    const normalized = normalizeLocationValue(item);
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};

const normalizePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const normalizeUserLocationEntry = (value: unknown): UserLocationEntry | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as LegacyUserLocationEntry;

  const id =
    normalizeLocationString(raw.id) ??
    normalizeLocationString(raw.locationId) ??
    normalizeLocationString(raw.key);
  if (!id) return null;

  const perBatchCap = normalizePositiveInteger(raw.perBatchCap ?? raw.cap);
  if (perBatchCap === null) return null;

  return { id, perBatchCap };
};

export const normalizeUserLocationPool = (
  rawPool: unknown,
): UserLocationEntry[] => {
  if (!Array.isArray(rawPool)) {
    return [];
  }

  const byId = new Map<string, UserLocationEntry>();
  for (const item of rawPool) {
    const normalized = normalizeUserLocationEntry(item);
    if (!normalized) continue;
    byId.set(normalized.id, normalized);
  }

  return Array.from(byId.values());
};

/** Backward-compatible alias kept for incremental migration of call sites. */
export const normalizeLocationPool = normalizeSystemLocationPool;

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
  systemLocationPool: jsonb("system_location_pool")
    .$type<SystemLocationEntry[]>()
    .notNull(),
  userLocationPool: jsonb("user_location_pool")
    .$type<UserLocationEntry[]>()
    .notNull(),
  timeWindowPool: jsonb("time_window_pool")
    .$type<TimeWindowEntry[]>()
    .notNull(),
  defaultMinPartners: integer("default_min_partners"),
  defaultMaxPartners: integer("default_max_partners"),
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
