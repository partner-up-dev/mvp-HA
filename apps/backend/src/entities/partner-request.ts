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

// Parsed partner request schema (from LLM)
export const parsedPRSchema = z.object({
  title: z.string().optional(),
  scenario: z.string(),
  time: z.string().nullable(),
  location: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  minParticipants: z.number().nullable(),
  maxParticipants: z.number().nullable(),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
});

export type ParsedPartnerRequest = z.infer<typeof parsedPRSchema>;

// Status enum
export const prStatusSchema = z.enum(["OPEN", "ACTIVE", "CLOSED", "EXPIRED"]);
export type PRStatus = z.infer<typeof prStatusSchema>;
export const prStatusManualSchema = z.enum(["OPEN", "ACTIVE", "CLOSED"]);
export type PRStatusManual = z.infer<typeof prStatusManualSchema>;

export const partnerRequestSummarySchema = z.object({
  id: z.number().int().positive(),
  status: prStatusSchema,
  participants: z.number().int().nonnegative(),
  createdAt: z.string(),
  parsed: z.object({
    title: z.string().optional(),
    scenario: z.string(),
  }),
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
  parsed: jsonb("parsed").$type<ParsedPartnerRequest>().notNull(),
  status: text("status").$type<PRStatus>().notNull().default("OPEN"),
  pinHash: text("pin_hash").notNull(),
  participants: integer("participants").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  xiaohongshuPoster: jsonb("xiaohongshu_poster")
    .$type<XiaohongshuPosterCache | null>()
    .default(null),
  wechatThumbnail: jsonb("wechat_thumbnail")
    .$type<WechatThumbnailCache | null>()
    .default(null),
});

// Zod schemas for validation
export const insertPartnerRequestSchema = createInsertSchema(partnerRequests, {
  parsed: parsedPRSchema,
  status: prStatusSchema,
});

export const selectPartnerRequestSchema = createSelectSchema(partnerRequests, {
  parsed: parsedPRSchema,
  status: prStatusSchema,
});

// Type inference
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type NewPartnerRequest = typeof partnerRequests.$inferInsert;
export type PRId = PartnerRequest["id"];
