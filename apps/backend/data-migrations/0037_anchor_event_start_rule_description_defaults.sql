update "anchor_events"
set "time_pool_config" = jsonb_set(
  "time_pool_config",
  '{startRules}',
  (
    select coalesce(
      jsonb_agg(
        case
          when rule_entry."value" ? 'description'
            then rule_entry."value"
          else rule_entry."value" || jsonb_build_object('description', null)
        end
        order by rule_entry."ordinality"
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(
      coalesce("time_pool_config" -> 'startRules', '[]'::jsonb)
    ) with ordinality as rule_entry("value", "ordinality")
  )
)
where jsonb_typeof("time_pool_config" -> 'startRules') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(
      coalesce("time_pool_config" -> 'startRules', '[]'::jsonb)
    ) as rule_entry("value")
    where not (rule_entry."value" ? 'description')
  );
