alter table "anchor_events"
  add column "system_location_pool" jsonb not null default '[]'::jsonb,
  add column "user_location_pool" jsonb not null default '[]'::jsonb;

update "anchor_events"
set "system_location_pool" = coalesce("location_pool", '[]'::jsonb);

alter table "anchor_events"
  drop column "location_pool";

alter table "anchor_partner_requests"
  add column "location_source" text not null default 'SYSTEM';
