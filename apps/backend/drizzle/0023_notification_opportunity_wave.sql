create table if not exists "notification_opportunities" (
  "id" bigserial primary key,
  "event_id" uuid references "domain_events"("id") on delete set null,
  "job_id" bigint references "jobs"("id") on delete set null,
  "notification_kind" text not null,
  "lifecycle_model" text not null,
  "aggregate_type" text not null,
  "aggregate_id" text not null,
  "recipient_user_id" uuid not null references "users"("id") on delete cascade,
  "channel" text not null,
  "status" text not null default 'CREATED',
  "run_at" timestamp not null,
  "dedupe_key" text not null,
  "payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamp not null default now(),
  "updated_at" timestamp not null default now()
);

create unique index if not exists "notification_opportunities_dedupe_key_uq"
  on "notification_opportunities" ("dedupe_key");

create index if not exists "notification_opportunities_event_id_idx"
  on "notification_opportunities" ("event_id");

create index if not exists "notification_opportunities_job_id_idx"
  on "notification_opportunities" ("job_id");

create index if not exists "notification_opportunities_aggregate_idx"
  on "notification_opportunities" ("aggregate_type", "aggregate_id");

create index if not exists "notification_opportunities_recipient_status_idx"
  on "notification_opportunities" ("recipient_user_id", "status");

create table if not exists "notification_waves" (
  "id" bigserial primary key,
  "wave_start_event_id" uuid references "domain_events"("id") on delete set null,
  "notification_kind" text not null,
  "aggregate_type" text not null,
  "aggregate_id" text not null,
  "recipient_user_id" uuid not null references "users"("id") on delete cascade,
  "wave_key" text not null,
  "wave_start_message_id" bigint,
  "status" text not null default 'OPEN',
  "opened_at" timestamp not null default now(),
  "last_notified_at" timestamp,
  "resolved_at" timestamp,
  "canceled_at" timestamp,
  "created_at" timestamp not null default now(),
  "updated_at" timestamp not null default now()
);

create unique index if not exists "notification_waves_kind_wave_key_uq"
  on "notification_waves" ("notification_kind", "wave_key");

create index if not exists "notification_waves_event_id_idx"
  on "notification_waves" ("wave_start_event_id");

create index if not exists "notification_waves_aggregate_idx"
  on "notification_waves" ("aggregate_type", "aggregate_id");

create index if not exists "notification_waves_recipient_status_idx"
  on "notification_waves" ("recipient_user_id", "status");

