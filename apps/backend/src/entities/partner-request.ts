import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users, type UserId } from "./user";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const isoDateOrDateTimeSchema = z.union([isoDateTimeSchema, isoDateSchema]);
const partnerSlotIdSchema = z.number().int().positive();
const weekdayLabelSchema = z.string().trim().min(1).max(32);
export type WeekdayLabel = z.infer<typeof weekdayLabelSchema>;

// Partner request fields (from LLM / client edits)
export const partnerRequestFieldsSchema = z.object({
  title: z.string().optional(),
  type: z.string(),
  time: z.tuple([
    isoDateOrDateTimeSchema.nullable(),
    isoDateOrDateTimeSchema.nullable(),
  ]),
  location: z.string().nullable(),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  partners: z.array(partnerSlotIdSchema).default([]),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
});

export type PartnerRequestFields = z.infer<typeof partnerRequestFieldsSchema>;

// Status enum
export const prStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "READY",
  "FULL",
  "LOCKED_TO_START",
  "ACTIVE",
  "CLOSED",
  "EXPIRED",
]);
export type PRStatus = z.infer<typeof prStatusSchema>;
export const prStatusManualSchema = z.enum([
  "OPEN",
  "READY",
  "ACTIVE",
  "CLOSED",
]);
export type PRStatusManual = z.infer<typeof prStatusManualSchema>;

export const prKindSchema = z.enum(["ANCHOR", "COMMUNITY"]);
export type PRKind = z.infer<typeof prKindSchema>;

export const visibilityStatusSchema = z.enum(["VISIBLE", "HIDDEN"]);
export type VisibilityStatus = z.infer<typeof visibilityStatusSchema>;

export const paymentModelSchema = z.enum(["A", "C"]);
export type PaymentModel = z.infer<typeof paymentModelSchema>;

export const economicPolicyScopeSchema = z.enum([
  "EVENT_DEFAULT",
  "BATCH_OVERRIDE",
]);
export type EconomicPolicyScope = z.infer<typeof economicPolicyScopeSchema>;

export const createPRStructuredStatusSchema = z.literal("DRAFT");
export type CreatePRStructuredStatus = z.infer<
  typeof createPRStructuredStatusSchema
>;

export const createStructuredPRSchema = partnerRequestFieldsSchema;

export const createNaturalLanguagePRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  nowIso: z.string().datetime(),
  nowWeekday: weekdayLabelSchema.nullable().optional(),
});

export const partnerRequestSummarySchema = z.object({
  id: z.number().int().positive(),
  prKind: prKindSchema,
  canonicalPath: z.string(),
  status: prStatusSchema,
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  partners: z.array(partnerSlotIdSchema),
  createdAt: z.string(),
  title: z.string().optional(),
  type: z.string(),
});

export type PartnerRequestSummary = z.infer<typeof partnerRequestSummarySchema>;

// Poster cache schemas
export const xiaohongshuPosterSchema = z.object({
  caption: z.string(),
  posterStylePrompt: z.string(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export const wechatThumbnailSchema = z.object({
  style: z.number().int().nonnegative(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export type XiaohongshuPosterCache = z.infer<typeof xiaohongshuPosterSchema>;
export type WechatThumbnailCache = z.infer<typeof wechatThumbnailSchema>;

// Drizzle table definition
export const partnerRequests = pgTable("partner_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title"),
  type: text("type").notNull(),
  time: text("time_window")
    .array()
    .$type<[string | null, string | null]>()
    .notNull()
    .default(sql`ARRAY[NULL, NULL]::text[]`),
  location: text("location"),
  status: text("status").$type<PRStatus>().notNull().default("OPEN"),
  visibilityStatus: text("visibility_status")
    .$type<VisibilityStatus>()
    .notNull()
    .default("VISIBLE"),
  confirmationStartOffsetMinutes: integer("confirmation_start_offset_minutes"),
  confirmationEndOffsetMinutes: integer("confirmation_end_offset_minutes"),
  joinLockOffsetMinutes: integer("join_lock_offset_minutes"),
  minPartners: integer("min_partners"),
  maxPartners: integer("max_partners"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  preferences: text("preferences")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  notes: text("notes"),
  createdBy: uuid("created_by")
    .$type<UserId | null>()
    .references(() => users.id, { onDelete: "set null" }),
  xiaohongshuPoster: jsonb("xiaohongshu_poster")
    .$type<XiaohongshuPosterCache | null>()
    .default(null),
  wechatThumbnail: jsonb("wechat_thumbnail")
    .$type<WechatThumbnailCache | null>()
    .default(null),
  prKind: text("pr_kind").$type<PRKind>().notNull().default("COMMUNITY"),
});

// Zod schemas for validation
export const insertPartnerRequestSchema = createInsertSchema(partnerRequests, {
  time: partnerRequestFieldsSchema.shape.time,
  minPartners: partnerRequestFieldsSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsSchema.shape.maxPartners,
  status: prStatusSchema,
  visibilityStatus: visibilityStatusSchema,
});

export const selectPartnerRequestSchema = createSelectSchema(partnerRequests, {
  time: partnerRequestFieldsSchema.shape.time,
  minPartners: partnerRequestFieldsSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsSchema.shape.maxPartners,
  status: prStatusSchema,
  visibilityStatus: visibilityStatusSchema,
});

// Type inference
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type NewPartnerRequest = typeof partnerRequests.$inferInsert;
export type PRId = PartnerRequest["id"];
