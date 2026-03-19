alter table "anchor_partner_requests"
  add column "confirmation_start_offset_minutes" integer not null default 120,
  add column "confirmation_end_offset_minutes" integer not null default 30,
  add column "join_lock_offset_minutes" integer not null default 30,
  add column "booking_triggered_at" timestamp;
