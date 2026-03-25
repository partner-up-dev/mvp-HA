alter table anchor_events
  add column "default_confirmation_start_offset_minutes" integer not null default 120,
  add column "default_confirmation_end_offset_minutes" integer not null default 30,
  add column "default_join_lock_offset_minutes" integer not null default 30;

