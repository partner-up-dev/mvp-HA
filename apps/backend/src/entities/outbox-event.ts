import {
  pgTable,
  bigserial,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { domainEvents } from "./domain-event";

export const outboxStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
export type OutboxStatus = z.infer<typeof outboxStatusSchema>;

export const outboxEvents = pgTable("outbox_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => domainEvents.id, { onDelete: "cascade" }),
  status: text("status").$type<OutboxStatus>().notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptedAt: timestamp("last_attempted_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOutboxEventSchema = createInsertSchema(outboxEvents);
export const selectOutboxEventSchema = createSelectSchema(outboxEvents);

export type OutboxEventRow = typeof outboxEvents.$inferSelect;
export type NewOutboxEventRow = typeof outboxEvents.$inferInsert;
