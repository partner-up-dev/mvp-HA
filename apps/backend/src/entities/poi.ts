import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const pois = pgTable("pois", {
  id: text("id").primaryKey(),
  gallery: text("gallery").array().notNull().default([]),
  perTimeWindowCap: integer("per_time_window_cap"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPoiSchema = createInsertSchema(pois);
export const selectPoiSchema = createSelectSchema(pois);

export type Poi = typeof pois.$inferSelect;
export type NewPoi = typeof pois.$inferInsert;
export type PoiId = Poi["id"];
