import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userTelemetryJourneys = pgTable(
  "user_telemetry_journeys",
  {
    id: uuid("id").primaryKey(),
    anonymousId: text("anonymous_id"),
    userIdHash: text("user_id_hash"),
    startedAt: timestamp("started_at").notNull(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    startRoute: text("start_route"),
    startRouteName: text("start_route_name"),
    startReferrer: text("start_referrer"),
    startSpm: text("start_spm"),
    currentSpm: text("current_spm"),
    startSourceQr: text("start_source_qr"),
    currentSourceQr: text("current_source_qr"),
    startEventId: integer("start_event_id"),
    startPrId: integer("start_pr_id"),
    entryKind: text("entry_kind"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    startedAtIdx: index("user_telemetry_journeys_started_at_idx").on(
      table.startedAt,
    ),
    startSpmStartedAtIdx: index(
      "user_telemetry_journeys_start_spm_started_at_idx",
    ).on(table.startSpm, table.startedAt),
    anonymousStartedAtIdx: index(
      "user_telemetry_journeys_anonymous_started_at_idx",
    ).on(table.anonymousId, table.startedAt),
  }),
);

export const userTelemetrySegments = pgTable(
  "user_telemetry_segments",
  {
    id: uuid("id").primaryKey(),
    appJourneyId: uuid("app_journey_id")
      .notNull()
      .references(() => userTelemetryJourneys.id),
    segmentKind: text("segment_kind").notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    eventId: integer("event_id"),
    prId: integer("pr_id"),
    assignedMode: text("assigned_mode"),
    renderedMode: text("rendered_mode"),
    assignmentRevision: text("assignment_revision"),
    segmentStartRoute: text("segment_start_route"),
    segmentStartSpm: text("segment_start_spm"),
    segmentStartSourceQr: text("segment_start_source_qr"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    kindStartedAtIdx: index("user_telemetry_segments_kind_started_at_idx").on(
      table.segmentKind,
      table.startedAt,
    ),
    journeyStartedAtIdx: index(
      "user_telemetry_segments_journey_started_at_idx",
    ).on(table.appJourneyId, table.startedAt),
    eventModeStartedAtIdx: index(
      "user_telemetry_segments_event_mode_started_at_idx",
    ).on(table.eventId, table.renderedMode, table.startedAt),
  }),
);

export const userTelemetryEvents = pgTable(
  "user_telemetry_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventName: text("event_name").notNull(),
    eventKind: text("event_kind").notNull(),
    source: text("source").notNull(),
    anonymousId: text("anonymous_id"),
    userIdHash: text("user_id_hash"),
    appJourneyId: uuid("app_journey_id")
      .notNull()
      .references(() => userTelemetryJourneys.id),
    segmentId: uuid("segment_id").references(() => userTelemetrySegments.id),
    routePath: text("route_path"),
    routeName: text("route_name"),
    referrer: text("referrer"),
    startSpm: text("start_spm"),
    currentSpm: text("current_spm"),
    sourceQr: text("source_qr"),
    correlationId: text("correlation_id"),
    requestId: text("request_id"),
    traceId: text("trace_id"),
    eventIdRef: integer("event_id_ref"),
    prIdRef: integer("pr_id_ref"),
    cardKey: text("card_key"),
    segmentKey: text("segment_key"),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
  },
  (table) => ({
    eventNameOccurredAtIdx: index(
      "user_telemetry_events_name_occurred_at_idx",
    ).on(table.eventName, table.occurredAt),
    journeyOccurredAtIdx: index(
      "user_telemetry_events_journey_occurred_at_idx",
    ).on(table.appJourneyId, table.occurredAt),
    segmentOccurredAtIdx: index(
      "user_telemetry_events_segment_occurred_at_idx",
    ).on(table.segmentId, table.occurredAt),
    eventRefOccurredAtIdx: index(
      "user_telemetry_events_event_ref_occurred_at_idx",
    ).on(table.eventIdRef, table.occurredAt),
    prRefOccurredAtIdx: index(
      "user_telemetry_events_pr_ref_occurred_at_idx",
    ).on(table.prIdRef, table.occurredAt),
    cardKeyOccurredAtIdx: index(
      "user_telemetry_events_card_key_occurred_at_idx",
    ).on(table.cardKey, table.occurredAt),
    currentSpmOccurredAtIdx: index(
      "user_telemetry_events_current_spm_occurred_at_idx",
    ).on(table.currentSpm, table.occurredAt),
    correlationIdIdx: index("user_telemetry_events_correlation_id_idx").on(
      table.correlationId,
    ),
    requestIdIdx: index("user_telemetry_events_request_id_idx").on(
      table.requestId,
    ),
  }),
);

export const insertUserTelemetryJourneySchema = createInsertSchema(
  userTelemetryJourneys,
);
export const selectUserTelemetryJourneySchema = createSelectSchema(
  userTelemetryJourneys,
);
export const insertUserTelemetrySegmentSchema = createInsertSchema(
  userTelemetrySegments,
);
export const selectUserTelemetrySegmentSchema = createSelectSchema(
  userTelemetrySegments,
);
export const insertUserTelemetryEventSchema =
  createInsertSchema(userTelemetryEvents);
export const selectUserTelemetryEventSchema =
  createSelectSchema(userTelemetryEvents);

export type UserTelemetryJourney = typeof userTelemetryJourneys.$inferSelect;
export type NewUserTelemetryJourney = typeof userTelemetryJourneys.$inferInsert;
export type UserTelemetrySegment = typeof userTelemetrySegments.$inferSelect;
export type NewUserTelemetrySegment = typeof userTelemetrySegments.$inferInsert;
export type UserTelemetryEvent = typeof userTelemetryEvents.$inferSelect;
export type NewUserTelemetryEvent = typeof userTelemetryEvents.$inferInsert;
