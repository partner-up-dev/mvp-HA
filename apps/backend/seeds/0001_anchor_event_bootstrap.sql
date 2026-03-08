insert into anchor_events (
  id,
  title,
  type,
  description,
  location_pool,
  time_window_pool,
  cover_image,
  status,
  payment_model,
  discount_rate_default,
  subsidy_cap_default,
  resource_booking_deadline_rule,
  cancellation_policy,
  created_at,
  updated_at
)
values
  (
    1,
    '羽毛球',
    'BADMINTON',
    null,
    $$["广外南体育馆羽毛球场1号场", "广外南体育馆羽毛球场2号场"]$$::jsonb,
    $$[["2026-03-03T17:00:00+08:00", "2026-03-03T18:00:00+08:00"], ["2026-03-04T17:00:00+08:00", "2026-03-04T18:00:00+08:00"]]$$::jsonb,
    null,
    'ACTIVE',
    'C',
    null,
    null,
    null,
    null,
    '2026-03-01 12:34:35.909573'::timestamp,
    '2026-03-01 12:34:35.909573'::timestamp
  ),
  (
    2,
    '茶话会',
    'SMALLTALK',
    null,
    $$["广外南一饭一楼惠天美旁", "云山水榭"]$$::jsonb,
    $$[["2026-03-07T14:00:00+08:00", "2026-03-03T14:30:00+08:00"], ["2026-03-012T20:00:00+08:00", "2026-03-04T20:30:00+08:00"]]$$::jsonb,
    null,
    'ACTIVE',
    'A',
    null,
    null,
    null,
    null,
    '2026-03-02 07:50:32.101177'::timestamp,
    '2026-03-02 07:50:32.101177'::timestamp
  )
on conflict (id) do update
set
  title = excluded.title,
  type = excluded.type,
  description = excluded.description,
  location_pool = excluded.location_pool,
  time_window_pool = excluded.time_window_pool,
  cover_image = excluded.cover_image,
  status = excluded.status,
  payment_model = excluded.payment_model,
  discount_rate_default = excluded.discount_rate_default,
  subsidy_cap_default = excluded.subsidy_cap_default,
  resource_booking_deadline_rule = excluded.resource_booking_deadline_rule,
  cancellation_policy = excluded.cancellation_policy,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

select setval(
  pg_get_serial_sequence('anchor_events', 'id'),
  coalesce((select max(id) from anchor_events), 1),
  true
);

insert into anchor_event_batches (
  id,
  anchor_event_id,
  time_window,
  status,
  discount_rate_override,
  subsidy_cap_override,
  economic_policy_version,
  created_at
)
values
  (
    1,
    1,
    array['2026-03-03T17:00:00+08:00', '2026-03-03T18:00:00+08:00']::text[],
    'OPEN',
    null,
    null,
    1,
    '2026-03-01 12:35:51.25299'::timestamp
  ),
  (
    2,
    2,
    array['2026-03-07T14:00:00+08:00', '2026-03-03T14:30:00+08:00']::text[],
    'OPEN',
    null,
    null,
    1,
    '2026-03-02 07:51:08.314932'::timestamp
  )
on conflict (id) do update
set
  anchor_event_id = excluded.anchor_event_id,
  time_window = excluded.time_window,
  status = excluded.status,
  discount_rate_override = excluded.discount_rate_override,
  subsidy_cap_override = excluded.subsidy_cap_override,
  economic_policy_version = excluded.economic_policy_version,
  created_at = excluded.created_at;

select setval(
  pg_get_serial_sequence('anchor_event_batches', 'id'),
  coalesce((select max(id) from anchor_event_batches), 1),
  true
);

insert into pois (
  id,
  gallery,
  created_at,
  updated_at
)
values
  (
    '广外南校体育馆羽毛球场1号场',
    array['https://oss-app.partner-up.cn/pois/4310f713-8897-4055-9be4-914a5ec7477f.jpg']::text[],
    '2026-03-03 11:55:30.133803'::timestamp,
    '2026-03-03 11:55:30.133803'::timestamp
  )
on conflict (id) do update
set
  gallery = excluded.gallery,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;