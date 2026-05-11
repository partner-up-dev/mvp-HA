alter table "pois"
  add column if not exists "availability_rules" jsonb not null default '[]'::jsonb;
