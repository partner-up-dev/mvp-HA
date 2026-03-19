import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

export const domainEvents = pgTable("domain_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDomainEventSchema = createInsertSchema(domainEvents);
export const selectDomainEventSchema = createSelectSchema(domainEvents);

export type DomainEventRow = typeof domainEvents.$inferSelect;
export type NewDomainEventRow = typeof domainEvents.$inferInsert;
