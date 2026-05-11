import {
  bigserial,
  bigint,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { anchorEvents } from "./anchor-event";

export const anchorEventPreferenceTagStatusSchema = z.enum([
  "PUBLISHED",
  "PENDING",
  "REJECTED",
]);
export type AnchorEventPreferenceTagStatus = z.infer<
  typeof anchorEventPreferenceTagStatusSchema
>;

export const anchorEventPreferenceTagLabelSchema = z.string().trim().min(1).max(80);
export const anchorEventPreferenceTagDescriptionSchema = z
  .string()
  .trim()
  .max(280);

export const anchorEventPreferenceTags = pgTable(
  "anchor_event_preference_tags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    anchorEventId: bigint("anchor_event_id", { mode: "number" })
      .notNull()
      .references(() => anchorEvents.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    status: text("status")
      .$type<AnchorEventPreferenceTagStatus>()
      .notNull()
      .default("PUBLISHED"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const insertAnchorEventPreferenceTagSchema = createInsertSchema(
  anchorEventPreferenceTags,
  {
    label: anchorEventPreferenceTagLabelSchema,
    description: anchorEventPreferenceTagDescriptionSchema,
    status: anchorEventPreferenceTagStatusSchema,
  },
);

export const selectAnchorEventPreferenceTagSchema = createSelectSchema(
  anchorEventPreferenceTags,
  {
    label: anchorEventPreferenceTagLabelSchema,
    description: anchorEventPreferenceTagDescriptionSchema,
    status: anchorEventPreferenceTagStatusSchema,
  },
);

export type AnchorEventPreferenceTag = typeof anchorEventPreferenceTags.$inferSelect;
export type NewAnchorEventPreferenceTag =
  typeof anchorEventPreferenceTags.$inferInsert;
export type AnchorEventPreferenceTagId = AnchorEventPreferenceTag["id"];
