import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  meetingPointConfigSchema,
  type MeetingPointConfig,
} from "./meeting-point";

const isoDateTimeWithOffsetSchema = z.string().datetime({ offset: true });
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const poiAvailabilityRuleModeSchema = z.enum(["INCLUDE", "EXCLUDE"]);
export type PoiAvailabilityRuleMode = z.infer<
  typeof poiAvailabilityRuleModeSchema
>;

export const poiAvailabilityFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);
export type PoiAvailabilityFrequency = z.infer<
  typeof poiAvailabilityFrequencySchema
>;

const poiAvailabilityBaseRuleSchema = z.object({
  id: z.string().trim().min(1),
  mode: poiAvailabilityRuleModeSchema,
});

export const poiAbsoluteAvailabilityRuleSchema =
  poiAvailabilityBaseRuleSchema
    .extend({
      kind: z.literal("ABSOLUTE"),
      startAt: isoDateTimeWithOffsetSchema,
      endAt: isoDateTimeWithOffsetSchema,
    })
    .superRefine((value, ctx) => {
      if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt must be after startAt",
          path: ["endAt"],
        });
      }
    });
export type PoiAbsoluteAvailabilityRule = z.infer<
  typeof poiAbsoluteAvailabilityRuleSchema
>;

export const poiRecurringAvailabilityRuleSchema =
  poiAvailabilityBaseRuleSchema
    .extend({
      kind: z.literal("RECURRING"),
      frequency: poiAvailabilityFrequencySchema,
      startTime: timeOfDaySchema,
      endTime: timeOfDaySchema,
      weekdays: z.array(z.number().int().min(0).max(6)).default([]),
      monthDays: z.array(z.number().int().min(1).max(31)).default([]),
      months: z.array(z.number().int().min(1).max(12)).default([]),
    })
    .superRefine((value, ctx) => {
      if (value.frequency === "WEEKLY" && value.weekdays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "weekdays are required for weekly recurrence",
          path: ["weekdays"],
        });
      }
      if (value.frequency === "MONTHLY" && value.monthDays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "monthDays are required for monthly recurrence",
          path: ["monthDays"],
        });
      }
      if (value.frequency === "YEARLY" && value.months.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "months are required for yearly recurrence",
          path: ["months"],
        });
      }
      if (value.frequency === "YEARLY" && value.monthDays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "monthDays are required for yearly recurrence",
          path: ["monthDays"],
        });
      }
    });
export type PoiRecurringAvailabilityRule = z.infer<
  typeof poiRecurringAvailabilityRuleSchema
>;

export const poiAvailabilityRuleSchema = z.union([
  poiAbsoluteAvailabilityRuleSchema,
  poiRecurringAvailabilityRuleSchema,
]);
export type PoiAvailabilityRule = z.infer<typeof poiAvailabilityRuleSchema>;

export const poiAvailabilityRulesSchema = z.array(poiAvailabilityRuleSchema);

export const normalizePoiAvailabilityRules = (
  rawRules: unknown,
): PoiAvailabilityRule[] => {
  const parsed = poiAvailabilityRulesSchema.safeParse(rawRules);
  return parsed.success ? parsed.data : [];
};

export const pois = pgTable("pois", {
  id: text("id").primaryKey(),
  gallery: text("gallery").array().notNull().default([]),
  perTimeWindowCap: integer("per_time_window_cap"),
  availabilityRules: jsonb("availability_rules")
    .$type<PoiAvailabilityRule[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  meetingPoint: jsonb("meeting_point")
    .$type<MeetingPointConfig | null>()
    .default(null),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPoiSchema = createInsertSchema(pois, {
  availabilityRules: poiAvailabilityRulesSchema,
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
});
export const selectPoiSchema = createSelectSchema(pois, {
  availabilityRules: poiAvailabilityRulesSchema,
  meetingPoint: meetingPointConfigSchema.nullable(),
});

export type Poi = typeof pois.$inferSelect;
export type NewPoi = typeof pois.$inferInsert;
export type PoiId = Poi["id"];
