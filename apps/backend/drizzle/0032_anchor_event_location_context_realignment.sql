alter table "anchor_events"
  add column if not exists "location_pool" jsonb;

with raw_locations as (
  select
    ae."id" as event_id,
    trim(both from sys_location."value" #>> '{}') as location_id,
    sys_location."ord"::integer as sort_order
  from "anchor_events" as ae
  cross join lateral jsonb_array_elements(
    coalesce(ae."system_location_pool", '[]'::jsonb)
  ) with ordinality as sys_location("value", "ord")
  where jsonb_typeof(sys_location."value") = 'string'

  union all

  select
    ae."id" as event_id,
    trim(both from coalesce(
      user_location."value" ->> 'id',
      user_location."value" ->> 'locationId',
      user_location."value" ->> 'key'
    )) as location_id,
    100000 + user_location."ord"::integer as sort_order
  from "anchor_events" as ae
  cross join lateral jsonb_array_elements(
    coalesce(ae."user_location_pool", '[]'::jsonb)
  ) with ordinality as user_location("value", "ord")
  where jsonb_typeof(user_location."value") = 'object'
),
deduped_locations as (
  select
    event_id,
    location_id,
    min(sort_order) as sort_order
  from raw_locations
  where location_id is not null and location_id <> ''
  group by event_id, location_id
),
merged_locations as (
  select
    event_id,
    jsonb_agg(to_jsonb(location_id) order by sort_order) as location_pool
  from deduped_locations
  group by event_id
)
update "anchor_events" as ae
set "location_pool" = merged_locations.location_pool
from merged_locations
where ae."id" = merged_locations.event_id
  and ae."location_pool" is null;

update "anchor_events"
set "location_pool" = '[]'::jsonb
where "location_pool" is null;

alter table "anchor_events"
  alter column "location_pool" set not null;

alter table "pois"
  add column if not exists "per_time_window_cap" integer;

with raw_caps as (
  select
    trim(both from sys_location."value" #>> '{}') as poi_id,
    1 as per_time_window_cap
  from "anchor_events" as ae
  cross join lateral jsonb_array_elements(
    coalesce(ae."system_location_pool", '[]'::jsonb)
  ) with ordinality as sys_location("value", "ord")
  where jsonb_typeof(sys_location."value") = 'string'

  union all

  select
    trim(both from coalesce(
      user_location."value" ->> 'id',
      user_location."value" ->> 'locationId',
      user_location."value" ->> 'key'
    )) as poi_id,
    case
      when coalesce(
        user_location."value" ->> 'perBatchCap',
        user_location."value" ->> 'cap'
      ) ~ '^[1-9][0-9]*$'
        then coalesce(
          user_location."value" ->> 'perBatchCap',
          user_location."value" ->> 'cap'
        )::integer
      else 1
    end as per_time_window_cap
  from "anchor_events" as ae
  cross join lateral jsonb_array_elements(
    coalesce(ae."user_location_pool", '[]'::jsonb)
  ) with ordinality as user_location("value", "ord")
  where jsonb_typeof(user_location."value") = 'object'
),
caps as (
  select
    poi_id,
    max(per_time_window_cap) as per_time_window_cap
  from raw_caps
  where poi_id is not null and poi_id <> ''
  group by poi_id
)
update "pois" as p
set "per_time_window_cap" = caps.per_time_window_cap
from caps
where p."id" = caps.poi_id
  and p."per_time_window_cap" is null;

drop table if exists "anchor_event_pr_attachments";

alter table "anchor_events"
  drop column if exists "system_location_pool",
  drop column if exists "user_location_pool";
