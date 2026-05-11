alter table "anchor_events"
  add column if not exists "time_pool_config" jsonb;

with legacy_batch_windows as (
  select
    batch."anchor_event_id" as "event_id",
    batch."time_window"[1] as "start_at",
    batch."time_window"[2] as "end_at",
    batch."earliest_lead_minutes" as "earliest_lead_minutes",
    row_number() over (
      partition by batch."anchor_event_id"
      order by batch."id"
    ) as "rule_order"
  from "anchor_event_batches" as batch
  where coalesce(array_length(batch."time_window", 1), 0) >= 2
    and batch."time_window"[1] is not null
    and batch."time_window"[2] is not null
),
legacy_pool_windows as (
  select
    event."id" as "event_id",
    window_entry ->> 0 as "start_at",
    window_entry ->> 1 as "end_at",
    null::integer as "earliest_lead_minutes",
    row_number() over (
      partition by event."id"
      order by window_entry_ordinality
    ) as "rule_order"
  from "anchor_events" as event
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(event."time_window_pool") = 'array'
        then event."time_window_pool"
      else '[]'::jsonb
    end
  ) with ordinality as pool(window_entry, window_entry_ordinality)
  where not exists (
      select 1
      from legacy_batch_windows as batch_window
      where batch_window."event_id" = event."id"
    )
    and jsonb_typeof(window_entry) = 'array'
    and coalesce(window_entry ->> 0, '') <> ''
    and coalesce(window_entry ->> 1, '') <> ''
),
legacy_windows as (
  select * from legacy_batch_windows
  union all
  select * from legacy_pool_windows
),
aggregated as (
  select
    window_row."event_id",
    max(window_row."earliest_lead_minutes")
      filter (where window_row."earliest_lead_minutes" is not null)
      as "earliest_lead_minutes",
    max(
      greatest(
        1,
        floor(
          extract(
            epoch from (
              window_row."end_at"::timestamptz
              - window_row."start_at"::timestamptz
            )
          ) / 60.0
        )::integer
      )
    ) as "duration_minutes",
    jsonb_agg(
      jsonb_build_object(
        'id',
        format('absolute-%s', window_row."rule_order"),
        'kind',
        'ABSOLUTE',
        'startAt',
        window_row."start_at"
      )
      order by window_row."rule_order"
    ) as "start_rules"
  from legacy_windows as window_row
  group by window_row."event_id"
)
update "anchor_events" as event
set "time_pool_config" = jsonb_build_object(
  'durationMinutes',
  aggregated."duration_minutes",
  'earliestLeadMinutes',
  aggregated."earliest_lead_minutes",
  'startRules',
  coalesce(aggregated."start_rules", '[]'::jsonb)
)
from aggregated
where event."id" = aggregated."event_id";

update "anchor_events"
set "time_pool_config" = jsonb_build_object(
  'durationMinutes',
  null,
  'earliestLeadMinutes',
  null,
  'startRules',
  '[]'::jsonb
)
where "time_pool_config" is null;

alter table "anchor_events"
  alter column "time_pool_config" set not null;

alter table "anchor_events"
  drop column if exists "time_window_pool";

alter table "anchor_pr_support_resources"
  drop column if exists "source_batch_support_override_id";

drop table if exists "anchor_event_batch_support_overrides";
drop table if exists "anchor_event_batches";
