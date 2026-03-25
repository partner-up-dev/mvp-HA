insert into anchor_events (
  id,
  title,
  type,
  description,
  system_location_pool,
  user_location_pool,
  time_window_pool,
  cover_image,
  status,
  created_at,
  updated_at
)
values
  (
    1,
    '羽毛球',
    'BADMINTON',
    '就在校内，场地费用我们出，你只管玩得开心！',
    $$["广外南体育馆羽毛球场1号场", "广外南体育馆羽毛球场2号场"]$$::jsonb,
    $$[]$$::jsonb,
    $$[["2026-03-10T17:00:00+08:00", "2026-03-10T18:00:00+08:00"], ["2026-03-11T17:00:00+08:00", "2026-03-11T18:00:00+08:00"]]$$::jsonb,
    null,
    'ACTIVE',
    '2026-03-01 12:34:35.909573'::timestamp,
    '2026-03-01 12:34:35.909573'::timestamp
  ),
  (
    2,
    '学习冲刺',
    'STUDY_SPRINT',
    '互相陪伴，独立学习',
    $$["图书馆自习区A桌", "图书馆自习区B桌"]$$::jsonb,
    $$[]$$::jsonb,
    $$[["2026-03-12T19:00:00+08:00", "2026-03-12T21:00:00+08:00"], ["2026-03-13T19:00:00+08:00", "2026-03-13T21:00:00+08:00"]]$$::jsonb,
    null,
    'ACTIVE',
    '2026-03-02 07:50:32.101177'::timestamp,
    '2026-03-02 07:50:32.101177'::timestamp
  )
on conflict (id) do update
set
  title = excluded.title,
  type = excluded.type,
  description = excluded.description,
  system_location_pool = excluded.system_location_pool,
  user_location_pool = excluded.user_location_pool,
  time_window_pool = excluded.time_window_pool,
  cover_image = excluded.cover_image,
  status = excluded.status,
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
  created_at
)
values
  (
    1,
    1,
    array['2026-03-10T17:00:00+08:00', '2026-03-10T18:00:00+08:00']::text[],
    'OPEN',
    '2026-03-01 12:35:51.25299'::timestamp
  ),
  (
    2,
    1,
    array['2026-03-11T17:00:00+08:00', '2026-03-11T18:00:00+08:00']::text[],
    'OPEN',
    '2026-03-01 12:36:51.25299'::timestamp
  ),
  (
    3,
    2,
    array['2026-03-12T19:00:00+08:00', '2026-03-12T21:00:00+08:00']::text[],
    'OPEN',
    '2026-03-02 07:51:08.314932'::timestamp
  ),
  (
    4,
    2,
    array['2026-03-13T19:00:00+08:00', '2026-03-13T21:00:00+08:00']::text[],
    'OPEN',
    '2026-03-02 07:52:08.314932'::timestamp
  )
on conflict (id) do update
set
  anchor_event_id = excluded.anchor_event_id,
  time_window = excluded.time_window,
  status = excluded.status,
  created_at = excluded.created_at;

select setval(
  pg_get_serial_sequence('anchor_event_batches', 'id'),
  coalesce((select max(id) from anchor_event_batches), 1),
  true
);

insert into anchor_event_support_resources (
  id,
  anchor_event_id,
  code,
  title,
  resource_kind,
  applies_to_all_locations,
  location_ids,
  booking_required,
  booking_handled_by,
  booking_deadline_rule,
  booking_locks_participant,
  cancellation_policy,
  settlement_mode,
  subsidy_rate,
  subsidy_cap,
  requires_user_transfer_to_platform,
  summary_text,
  detail_rules,
  display_order,
  created_at
)
values
  (
    1,
    1,
    'venue',
    '羽毛球场地',
    'VENUE',
    true,
    array[]::text[],
    true,
    'PLATFORM',
    'T-2h',
    true,
    '开场前 2 小时后，场地预订不可取消。',
    'PLATFORM_POSTPAID',
    1,
    40,
    false,
    '场地费用全包，按规则提交支付凭证即可报销。',
    array[
      '平台可以代为预订，也可以由你自行订场后申请报销。',
      '若场馆要求预付，请先联系客服确认处理方式。'
    ]::text[],
    0,
    '2026-03-01 12:40:00'::timestamp
  ),
  (
    2,
    1,
    'items',
    '活动物资',
    'ITEM',
    true,
    array[]::text[],
    false,
    null,
    null,
    false,
    null,
    'NONE',
    null,
    null,
    false,
    '活动现场赠送羽毛球和能量饮料。',
    array[
      '每位到场者可领取基础活动物资，数量以现场安排为准。'
    ]::text[],
    1,
    '2026-03-01 12:41:00'::timestamp
  ),
  (
    3,
    2,
    'study-kit',
    '学习冲刺物资',
    'ITEM',
    true,
    array[]::text[],
    false,
    null,
    null,
    false,
    null,
    'NONE',
    null,
    null,
    false,
    '活动现场提供桌面时钟和学习清单。',
    array[
      '学习物资仅限活动现场使用，请在结束后归还。'
    ]::text[],
    0,
    '2026-03-02 08:00:00'::timestamp
  )
on conflict (id) do update
set
  anchor_event_id = excluded.anchor_event_id,
  code = excluded.code,
  title = excluded.title,
  resource_kind = excluded.resource_kind,
  applies_to_all_locations = excluded.applies_to_all_locations,
  location_ids = excluded.location_ids,
  booking_required = excluded.booking_required,
  booking_handled_by = excluded.booking_handled_by,
  booking_deadline_rule = excluded.booking_deadline_rule,
  booking_locks_participant = excluded.booking_locks_participant,
  cancellation_policy = excluded.cancellation_policy,
  settlement_mode = excluded.settlement_mode,
  subsidy_rate = excluded.subsidy_rate,
  subsidy_cap = excluded.subsidy_cap,
  requires_user_transfer_to_platform = excluded.requires_user_transfer_to_platform,
  summary_text = excluded.summary_text,
  detail_rules = excluded.detail_rules,
  display_order = excluded.display_order,
  created_at = excluded.created_at;

select setval(
  pg_get_serial_sequence('anchor_event_support_resources', 'id'),
  coalesce((select max(id) from anchor_event_support_resources), 1),
  true
);

insert into anchor_event_batch_support_overrides (
  id,
  batch_id,
  event_support_resource_id,
  disabled,
  booking_deadline_rule_override,
  summary_text_override,
  detail_rules_override,
  created_at
)
values
  (
    1,
    1,
    1,
    false,
    'T-3h',
    '本场由平台统一协助预订，场地费用按规则全额报销。',
    array[
      '该场次会优先统一处理预订，请至少提前 3 小时确认。',
      '若你已经自行订场，也可以保留凭证后走报销流程。'
    ]::text[],
    '2026-03-01 12:45:00'::timestamp
  )
on conflict (id) do update
set
  batch_id = excluded.batch_id,
  event_support_resource_id = excluded.event_support_resource_id,
  disabled = excluded.disabled,
  booking_deadline_rule_override = excluded.booking_deadline_rule_override,
  summary_text_override = excluded.summary_text_override,
  detail_rules_override = excluded.detail_rules_override,
  created_at = excluded.created_at;

select setval(
  pg_get_serial_sequence('anchor_event_batch_support_overrides', 'id'),
  coalesce((select max(id) from anchor_event_batch_support_overrides), 1),
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
    '广外南体育馆羽毛球场1号场',
    array['https://oss-app.partner-up.cn/pois/4310f713-8897-4055-9be4-914a5ec7477f.jpg']::text[],
    '2026-03-03 11:55:30.133803'::timestamp,
    '2026-03-03 11:55:30.133803'::timestamp
  ),
  (
    '广外南体育馆羽毛球场2号场',
    array['https://oss-app.partner-up.cn/pois/4310f713-8897-4055-9be4-914a5ec7477f.jpg']::text[],
    '2026-03-03 11:56:30.133803'::timestamp,
    '2026-03-03 11:56:30.133803'::timestamp
  ),
  (
    '图书馆自习区A桌',
    array[]::text[],
    '2026-03-03 11:57:30.133803'::timestamp,
    '2026-03-03 11:57:30.133803'::timestamp
  ),
  (
    '图书馆自习区B桌',
    array[]::text[],
    '2026-03-03 11:58:30.133803'::timestamp,
    '2026-03-03 11:58:30.133803'::timestamp
  )
on conflict (id) do update
set
  gallery = excluded.gallery,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into config (
  key,
  value
)
values
  (
    'author_wechat_qr_code',
    'https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg'
  ),
  (
    'wechat_beta_group_qr_code',
    'https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg'
  ),
  (
    'wecom_staff_link',
    'https://work.weixin.qq.com/ca/cawcdeaeb65ab3d47f'
  ),
  (
    'wecom_service_qr_code',
    'https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg'
  ),
  (
    'wecom_support_link_wechat_in',
    'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
  ),
  (
    'wecom_support_link_wechat_out',
    'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
  ),
  (
    'wechat_official_account_username',
    ''
  )
on conflict (key) do update
set
  value = excluded.value;
