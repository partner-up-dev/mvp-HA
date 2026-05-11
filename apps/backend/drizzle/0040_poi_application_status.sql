alter table "pois"
  add column if not exists "status" text not null default 'PUBLISHED',
  add column if not exists "submitted_by_user_id" uuid references "users"("id") on delete set null,
  add column if not exists "reviewed_by_user_id" uuid references "users"("id") on delete set null,
  add column if not exists "reviewed_at" timestamp,
  add column if not exists "reject_reason" text;

create index if not exists "pois_status_idx"
  on "pois" ("status");

create index if not exists "pois_submitted_by_user_id_idx"
  on "pois" ("submitted_by_user_id");
