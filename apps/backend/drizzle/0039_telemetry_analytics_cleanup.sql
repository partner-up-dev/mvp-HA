alter table "notification_opportunities"
  drop column if exists "event_id";

alter table "notification_waves"
  drop column if exists "wave_start_event_id";

drop table if exists "outbox_events";
drop table if exists "domain_events";
drop table if exists "scenario_type_metrics";
drop table if exists "analytics_daily_community";
drop table if exists "analytics_daily_anchor";

create table if not exists "telemetry_events" (
  "id" uuid primary key default gen_random_uuid(),
  "type" text not null,
  "source" text not null,
  "session_id" text,
  "user_id_hash" text,
  "request_id" text,
  "payload" jsonb not null,
  "occurred_at" timestamp not null,
  "received_at" timestamp not null default now()
);

create index if not exists "telemetry_events_type_occurred_at_idx"
  on "telemetry_events" ("type", "occurred_at");

create index if not exists "telemetry_events_session_occurred_at_idx"
  on "telemetry_events" ("session_id", "occurred_at");

create index if not exists "telemetry_events_request_id_idx"
  on "telemetry_events" ("request_id");
