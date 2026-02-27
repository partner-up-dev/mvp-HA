import {
  pgTable,
  bigserial,
  bigint,
  text,
  jsonb,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { anchorEvents, type AnchorEventId } from "./anchor-event";
import {
  anchorEventBatches,
  type AnchorEventBatchId,
} from "./anchor-event-batch";

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

export const createPRStructuredStatusSchema = z.enum(["DRAFT", "OPEN"]);
export type CreatePRStructuredStatus = z.infer<
  typeof createPRStructuredStatusSchema
>;

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

export const createStructuredPRSchema = z.object({
  fields: partnerRequestFieldsSchema,
  pin: pinSchema,
  status: createPRStructuredStatusSchema,
});

export const createNaturalLanguagePRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  pin: pinSchema,
  nowIso: z.string().datetime(),
  nowWeekday: weekdayLabelSchema.nullable().optional(),
});

export const partnerRequestSummarySchema = z.object({
  id: z.number().int().positive(),
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
  rawText: text("raw_text").notNull(),
  title: text("title"),
  type: text("type").notNull(),
  time: text("time_window")
    .array()
    .$type<[string | null, string | null]>()
    .notNull()
    .default(sql`ARRAY[NULL, NULL]::text[]`),
  location: text("location"),
  status: text("status").$type<PRStatus>().notNull().default("OPEN"),
  pinHash: text("pin_hash").notNull(),
  minPartners: integer("min_partners"),
  maxPartners: integer("max_partners"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  budget: text("budget"),
  preferences: text("preferences")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  notes: text("notes"),
  xiaohongshuPoster: jsonb("xiaohongshu_poster")
    .$type<XiaohongshuPosterCache | null>()
    .default(null),
  wechatThumbnail: jsonb("wechat_thumbnail")
    .$type<WechatThumbnailCache | null>()
    .default(null),
  // --- GAPC-01: Anchor Event integration ---
  prKind: text("pr_kind").$type<PRKind>().notNull().default("COMMUNITY"),
  anchorEventId: bigint("anchor_event_id", { mode: "number" })
    .$type<AnchorEventId | null>()
    .references(() => anchorEvents.id, { onDelete: "set null" }),
  batchId: bigint("batch_id", { mode: "number" })
    .$type<AnchorEventBatchId | null>()
    .references(() => anchorEventBatches.id, { onDelete: "set null" }),
  visibilityStatus: text("visibility_status")
    .$type<VisibilityStatus>()
    .notNull()
    .default("VISIBLE"),
  autoHideAt: timestamp("auto_hide_at"),
});

// Zod schemas for validation
export const insertPartnerRequestSchema = createInsertSchema(partnerRequests, {
  time: partnerRequestFieldsSchema.shape.time,
  minPartners: partnerRequestFieldsSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsSchema.shape.maxPartners,
  status: prStatusSchema,
});

export const selectPartnerRequestSchema = createSelectSchema(partnerRequests, {
  time: partnerRequestFieldsSchema.shape.time,
  minPartners: partnerRequestFieldsSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsSchema.shape.maxPartners,
  status: prStatusSchema,
});

// Type inference
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type NewPartnerRequest = typeof partnerRequests.$inferInsert;
export type PRId = PartnerRequest["id"];
