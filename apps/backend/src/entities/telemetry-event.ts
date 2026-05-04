import { pgTable, text, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: text("type").notNull(),
    source: text("source").notNull(),
    sessionId: text("session_id"),
    userIdHash: text("user_id_hash"),
    requestId: text("request_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
  },
  (table) => ({
    typeOccurredAtIdx: index("telemetry_events_type_occurred_at_idx").on(
      table.type,
      table.occurredAt,
    ),
    sessionOccurredAtIdx: index("telemetry_events_session_occurred_at_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
    requestIdIdx: index("telemetry_events_request_id_idx").on(table.requestId),
  }),
);

export const insertTelemetryEventSchema = createInsertSchema(telemetryEvents);
export const selectTelemetryEventSchema = createSelectSchema(telemetryEvents);

export type TelemetryEventRow = typeof telemetryEvents.$inferSelect;
export type NewTelemetryEventRow = typeof telemetryEvents.$inferInsert;
