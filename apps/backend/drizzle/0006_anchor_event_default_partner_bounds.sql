alter table "anchor_events"
  add column if not exists "default_min_partners" integer;

alter table "anchor_events"
  add column if not exists "default_max_partners" integer;

