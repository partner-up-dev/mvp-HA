CREATE TABLE "user_telemetry_journeys" (
  "id" uuid PRIMARY KEY NOT NULL,
  "anonymous_id" text,
  "user_id_hash" text,
  "started_at" timestamp NOT NULL,
  "last_seen_at" timestamp NOT NULL,
  "start_route" text,
  "start_route_name" text,
  "start_referrer" text,
  "start_spm" text,
  "current_spm" text,
  "start_source_qr" text,
  "current_source_qr" text,
  "start_event_id" integer,
  "start_pr_id" integer,
  "entry_kind" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "user_telemetry_journeys_started_at_idx"
  ON "user_telemetry_journeys" ("started_at");
CREATE INDEX "user_telemetry_journeys_start_spm_started_at_idx"
  ON "user_telemetry_journeys" ("start_spm", "started_at");
CREATE INDEX "user_telemetry_journeys_anonymous_started_at_idx"
  ON "user_telemetry_journeys" ("anonymous_id", "started_at");

CREATE TABLE "user_telemetry_segments" (
  "id" uuid PRIMARY KEY NOT NULL,
  "app_journey_id" uuid NOT NULL REFERENCES "user_telemetry_journeys"("id"),
  "segment_kind" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "event_id" integer,
  "pr_id" integer,
  "assigned_mode" text,
  "rendered_mode" text,
  "assignment_revision" text,
  "segment_start_route" text,
  "segment_start_spm" text,
  "segment_start_source_qr" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "user_telemetry_segments_kind_started_at_idx"
  ON "user_telemetry_segments" ("segment_kind", "started_at");
CREATE INDEX "user_telemetry_segments_journey_started_at_idx"
  ON "user_telemetry_segments" ("app_journey_id", "started_at");
CREATE INDEX "user_telemetry_segments_event_mode_started_at_idx"
  ON "user_telemetry_segments" ("event_id", "rendered_mode", "started_at");

CREATE TABLE "user_telemetry_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "event_kind" text NOT NULL,
  "source" text NOT NULL,
  "anonymous_id" text,
  "user_id_hash" text,
  "app_journey_id" uuid NOT NULL REFERENCES "user_telemetry_journeys"("id"),
  "segment_id" uuid REFERENCES "user_telemetry_segments"("id"),
  "route_path" text,
  "route_name" text,
  "referrer" text,
  "start_spm" text,
  "current_spm" text,
  "source_qr" text,
  "correlation_id" text,
  "request_id" text,
  "trace_id" text,
  "event_id_ref" integer,
  "pr_id_ref" integer,
  "card_key" text,
  "segment_key" text,
  "properties" jsonb NOT NULL,
  "occurred_at" timestamp NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "user_telemetry_events_name_occurred_at_idx"
  ON "user_telemetry_events" ("event_name", "occurred_at");
CREATE INDEX "user_telemetry_events_journey_occurred_at_idx"
  ON "user_telemetry_events" ("app_journey_id", "occurred_at");
CREATE INDEX "user_telemetry_events_segment_occurred_at_idx"
  ON "user_telemetry_events" ("segment_id", "occurred_at");
CREATE INDEX "user_telemetry_events_event_ref_occurred_at_idx"
  ON "user_telemetry_events" ("event_id_ref", "occurred_at");
CREATE INDEX "user_telemetry_events_pr_ref_occurred_at_idx"
  ON "user_telemetry_events" ("pr_id_ref", "occurred_at");
CREATE INDEX "user_telemetry_events_card_key_occurred_at_idx"
  ON "user_telemetry_events" ("card_key", "occurred_at");
CREATE INDEX "user_telemetry_events_current_spm_occurred_at_idx"
  ON "user_telemetry_events" ("current_spm", "occurred_at");
CREATE INDEX "user_telemetry_events_correlation_id_idx"
  ON "user_telemetry_events" ("correlation_id");
CREATE INDEX "user_telemetry_events_request_id_idx"
  ON "user_telemetry_events" ("request_id");
