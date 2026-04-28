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

/** A location entry: POI.id or a free-form location label. */
export const locationEntrySchema = z.string().trim().min(1);
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

const isoDateTimeWithOffsetSchema = z.string().datetime({ offset: true });
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const anchorEventAbsoluteStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("ABSOLUTE"),
  startAt: isoDateTimeWithOffsetSchema,
});
export type AnchorEventAbsoluteStartRule = z.infer<
  typeof anchorEventAbsoluteStartRuleSchema
>;

export const anchorEventRecurringStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("RECURRING"),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  timeOfDay: timeOfDaySchema,
});
export type AnchorEventRecurringStartRule = z.infer<
  typeof anchorEventRecurringStartRuleSchema
>;

export const anchorEventStartRuleSchema = z.discriminatedUnion("kind", [
  anchorEventAbsoluteStartRuleSchema,
  anchorEventRecurringStartRuleSchema,
]);
export type AnchorEventStartRule = z.infer<typeof anchorEventStartRuleSchema>;

export const anchorEventTimePoolConfigSchema = z
  .object({
    durationMinutes: z.number().int().positive().nullable(),
    earliestLeadMinutes: z.number().int().nonnegative().nullable(),
    startRules: z.array(anchorEventStartRuleSchema),
  })
  .superRefine((value, ctx) => {
    if (value.startRules.length > 0 && value.durationMinutes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "durationMinutes is required when startRules are present",
        path: ["durationMinutes"],
      });
    }

    if (
      value.startRules.some((rule) => rule.kind === "RECURRING") &&
      value.earliestLeadMinutes === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "earliestLeadMinutes is required when recurring start rules are present",
        path: ["earliestLeadMinutes"],
      });
    }
  });
export type AnchorEventTimePoolConfig = z.infer<
  typeof anchorEventTimePoolConfigSchema
>;

const normalizeNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

const normalizePositiveIntegerValue = (value: unknown): number | null => {
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

const normalizeRuleId = (
  value: unknown,
  fallback: string,
): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

const normalizeTimeOfDayValue = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return timeOfDaySchema.safeParse(trimmed).success ? trimmed : null;
};

const normalizeIsoDateTimeWithOffset = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return isoDateTimeWithOffsetSchema.safeParse(trimmed).success ? trimmed : null;
};

const normalizeWeekdays = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const values = Array.from(
    new Set(
      value
        .flatMap((entry) => {
          if (typeof entry === "number" && Number.isInteger(entry)) {
            return [entry];
          }
          if (typeof entry === "string") {
            const parsed = Number(entry.trim());
            if (Number.isInteger(parsed)) {
              return [parsed];
            }
          }
          return [];
        })
        .filter((entry) => entry >= 0 && entry <= 6),
    ),
  );

  return values.sort((left, right) => left - right);
};

const normalizeStartRule = (
  value: unknown,
  index: number,
): AnchorEventStartRule | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const fallbackId = `rule-${index + 1}`;
  if (raw.kind === "ABSOLUTE") {
    const startAt = normalizeIsoDateTimeWithOffset(raw.startAt);
    if (!startAt) {
      return null;
    }
    return {
      id: normalizeRuleId(raw.id, fallbackId),
      kind: "ABSOLUTE",
      startAt,
    };
  }

  if (raw.kind === "RECURRING") {
    const timeOfDay = normalizeTimeOfDayValue(raw.timeOfDay);
    const weekdays = normalizeWeekdays(raw.weekdays);
    if (!timeOfDay || weekdays.length === 0) {
      return null;
    }
    return {
      id: normalizeRuleId(raw.id, fallbackId),
      kind: "RECURRING",
      weekdays,
      timeOfDay,
    };
  }

  return null;
};

export const emptyAnchorEventTimePoolConfig = (): AnchorEventTimePoolConfig => ({
  durationMinutes: null,
  earliestLeadMinutes: null,
  startRules: [],
});

export const normalizeAnchorEventTimePoolConfig = (
  rawConfig: unknown,
): AnchorEventTimePoolConfig => {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    return emptyAnchorEventTimePoolConfig();
  }

  const raw = rawConfig as Record<string, unknown>;
  const startRules = Array.isArray(raw.startRules)
    ? raw.startRules
        .map((entry, index) => normalizeStartRule(entry, index))
        .filter((entry): entry is AnchorEventStartRule => entry !== null)
    : [];

  const normalized: AnchorEventTimePoolConfig = {
    durationMinutes: normalizePositiveIntegerValue(raw.durationMinutes),
    earliestLeadMinutes: normalizeNonNegativeInteger(raw.earliestLeadMinutes),
    startRules,
  };

  return anchorEventTimePoolConfigSchema.safeParse(normalized).success
    ? normalized
    : emptyAnchorEventTimePoolConfig();
};

// ---------------------------------------------------------------------------
// Drizzle table
// ---------------------------------------------------------------------------

export const anchorEvents = pgTable("anchor_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  locationPool: jsonb("location_pool")
    .$type<LocationEntry[]>()
    .notNull(),
  timePoolConfig: jsonb("time_pool_config")
    .$type<AnchorEventTimePoolConfig>()
    .notNull(),
  defaultMinPartners: integer("default_min_partners"),
  defaultMaxPartners: integer("default_max_partners"),
  defaultConfirmationStartOffsetMinutes: integer(
    "default_confirmation_start_offset_minutes",
  ),
  defaultConfirmationEndOffsetMinutes: integer(
    "default_confirmation_end_offset_minutes",
  ),
  defaultJoinLockOffsetMinutes: integer("default_join_lock_offset_minutes"),
  coverImage: text("cover_image"),
  betaGroupQrCode: text("beta_group_qr_code"),
  status: text("status").$type<AnchorEventStatus>().notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Drizzle-Zod
// ---------------------------------------------------------------------------

export const insertAnchorEventSchema = createInsertSchema(anchorEvents, {
  timePoolConfig: anchorEventTimePoolConfigSchema,
});
export const selectAnchorEventSchema = createSelectSchema(anchorEvents, {
  timePoolConfig: anchorEventTimePoolConfigSchema,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnchorEvent = typeof anchorEvents.$inferSelect;
export type NewAnchorEvent = typeof anchorEvents.$inferInsert;
export type AnchorEventId = AnchorEvent["id"];
