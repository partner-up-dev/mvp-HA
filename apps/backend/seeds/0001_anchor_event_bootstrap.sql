insert into anchor_events (
  id,
  title,
  type,
  description,
  location_pool,
  time_pool_config,
  default_min_partners,
  default_max_partners,
  default_confirmation_start_offset_minutes,
  default_confirmation_end_offset_minutes,
  default_join_lock_offset_minutes,
  cover_image,
  beta_group_qr_code,
  status,
  created_at,
  updated_at
)
values
  (
    1,
    '羽毛球搭子',
    'BADMINTON',
    '免场地费，并提供免费羽毛球与能量饮料；你只管打得开心。',
    jsonb_build_array('广外南校羽毛球馆', '广外南8栋楼下羽毛球场'),
    jsonb_build_object(
      'durationMinutes', 60,
      'earliestLeadMinutes', 1440,
      'startRules', jsonb_build_array(
        jsonb_build_object(
          'id', 'weekly-wed-fri-1720',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(3, 5),
          'timeOfDay', '17:20'
        ),
        jsonb_build_object(
          'id', 'weekly-thu-1700',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(4),
          'timeOfDay', '17:00'
        ),
        jsonb_build_object(
          'id', 'weekly-sat-1100',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(6),
          'timeOfDay', '11:00'
        ),
        jsonb_build_object(
          'id', 'weekly-sat-1500',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(6),
          'timeOfDay', '15:00'
        )
      )
    ),
    2,
    4,
    120,
    30,
    30,
    'https://oss-app.partner-up.cn/pois/4310f713-8897-4055-9be4-914a5ec7477f.jpg',
    'https://oss-app.partner-up.cn/support/b969443b-6012-483f-9ef2-234842539935.png',
    'ACTIVE',
    cast('2026-03-19 14:23:01.484433' as timestamp),
    cast('2026-04-23 01:54:29.215' as timestamp)
  ),
  (
    2,
    '自习搭子',
    'STUDY_SPRINT',
    '3人一组，50分钟独立学习+5分钟互相汇报',
    jsonb_build_array('云山水榭', '云山咖啡', '贝岗CommonHouse'),
    jsonb_build_object(
      'durationMinutes', 60,
      'earliestLeadMinutes', 1440,
      'startRules', jsonb_build_array(
        jsonb_build_object(
          'id', 'weekly-wed-thu-fri-1540',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(3, 4, 5),
          'timeOfDay', '15:40'
        ),
        jsonb_build_object(
          'id', 'weekly-sat-1030',
          'kind', 'RECURRING',
          'weekdays', jsonb_build_array(6),
          'timeOfDay', '10:30'
        )
      )
    ),
    3,
    4,
    120,
    30,
    30,
    'https://oss-app.partner-up.cn/pois/alexis-brown-omeaHbEFlN4-unsplash.jpg',
    'https://oss-app.partner-up.cn/support/b969443b-6012-483f-9ef2-234842539935.png',
    'ACTIVE',
    cast('2026-03-19 14:23:48.781853' as timestamp),
    cast('2026-04-23 01:54:33.86' as timestamp)
  )
on conflict (id) do update
set
  title = excluded.title,
  type = excluded.type,
  description = excluded.description,
  location_pool = excluded.location_pool,
  time_pool_config = excluded.time_pool_config,
  default_min_partners = excluded.default_min_partners,
  default_max_partners = excluded.default_max_partners,
  default_confirmation_start_offset_minutes = excluded.default_confirmation_start_offset_minutes,
  default_confirmation_end_offset_minutes = excluded.default_confirmation_end_offset_minutes,
  default_join_lock_offset_minutes = excluded.default_join_lock_offset_minutes,
  cover_image = excluded.cover_image,
  beta_group_qr_code = excluded.beta_group_qr_code,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

select setval(
  pg_get_serial_sequence('anchor_events', 'id'),
  coalesce((select max(id) from anchor_events), 1),
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
    'gdufs_south_badminton_venue',
    '广外南羽毛球馆',
    'VENUE',
    false,
    array['广外南校羽毛球馆'],
    true,
    'PLATFORM_PASSTHROUGH',
    'T-4h',
    false,
    '无特别说明',
    'PLATFORM_PREPAID',
    NULL,
    10,
    false,
    '平台代订广外南体育馆羽毛球场',
    array[
      '平台会在活动开始前一天的早上9点为您和您的搭子与羽毛球馆电话预订场地',
      '预订场地时使用的是该搭子请求第一个加入者的手机号，到场后您需要和工作人员报手机号以进入预订好的场地',
      '建议提前30分钟到达',
      '场地费用平台已经预先付清'
    ],
    0,
    cast('2026-04-07 15:21:10.724419' as timestamp)
  ),
  (
    2,
    1,
    'enegry_drink',
    '能量饮料',
    'ITEM',
    true,
    cast(array[] as text[]),
    false,
    NULL,
    NULL,
    false,
    '无',
    'PLATFORM_PREPAID',
    NULL,
    20,
    false,
    '免费能量饮料一瓶',
    array[
      '每位搭子一瓶能量饮料（电解质水宝矿力或脉动）',
      '活动开始后的30分钟内送到场地，平台人力资源不足，如有迟到或缺失请多包涵'
    ],
    1,
    cast('2026-04-07 15:21:10.724419' as timestamp)
  ),
  (
    3,
    1,
    'badminton_ball',
    '羽毛球',
    'ITEM',
    true,
    cast(array[] as text[]),
    false,
    NULL,
    NULL,
    false,
    '无',
    'PLATFORM_PREPAID',
    NULL,
    4,
    false,
    '免费羽毛球',
    array[
      '每活动一个',
      '活动开始前5分钟到开始后15分钟内送达，平台人力资源不足，如有迟到或缺失请多包涵'
    ],
    2,
    cast('2026-04-07 15:21:10.724419' as timestamp)
  ),
  (
    4,
    2,
    'yunshan_shuixie',
    '云山水榭',
    'VENUE',
    false,
    array['云山水榭'],
    true,
    'PLATFORM',
    'T-12h',
    false,
    NULL,
    'PLATFORM_PREPAID',
    32,
    NULL,
    false,
    '云山水榭场地预订',
    cast(array[] as text[]),
    0,
    cast('2026-04-08 11:33:28.277965' as timestamp)
  ),
  (
    5,
    2,
    'yunshan_shuixie_beverage',
    '云山水榭饮品',
    'ITEM',
    false,
    array['云山水榭'],
    false,
    NULL,
    NULL,
    false,
    '无',
    'PLATFORM_PREPAID',
    NULL,
    32,
    false,
    '免费云山水榭壶装饮品',
    array[
      '您和您的搭子可以在入座后与服务员下单任意一壶云山水榭的壶装饮品',
      '壶装饮品包括蜂蜜柚子茶、皇室奶茶、冻柠茶、夏威夷冰茶、黄金椰椰乌龙、葡萄冰茶',
      '平台已经预先支付了费用，您无需另外付款'
    ],
    1,
    cast('2026-04-08 11:33:28.277965' as timestamp)
  ),
  (
    6,
    2,
    'yunshan_coffee_drink',
    '云山咖啡饮品',
    'ITEM',
    false,
    array['云山咖啡'],
    false,
    NULL,
    NULL,
    false,
    NULL,
    'PLATFORM_POSTPAID',
    NULL,
    12,
    false,
    '云山咖啡饮品报销',
    array[
      '必须是本场活动内的消费',
      '消费后在“需要帮助”找到我们，提供支付截屏以报销',
      '上限10元'
    ],
    2,
    cast('2026-04-08 11:33:28.277965' as timestamp)
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

insert into pois (
  id,
  gallery,
  per_time_window_cap,
  availability_rules,
  created_at,
  updated_at
)
values
  (
    '广外南校羽毛球馆',
    array[
      'https://oss-app.partner-up.cn/pois/d17675d8-904c-47d0-a81a-8b3a6a411668.jpg',
      'https://oss-app.partner-up.cn/pois/13898b3b-47a4-4c55-a1b6-8a068b4ae53e.jpg'
    ],
    1,
    jsonb_build_array(),
    cast('2026-03-19 16:20:21.547892' as timestamp),
    cast('2026-04-07 07:11:00.194' as timestamp)
  ),
  (
    '广外南8栋楼下羽毛球场',
    array['https://oss-app.partner-up.cn/pois/34cbebbc-8b74-4067-8436-c139e35d167e.jpg'],
    3,
    jsonb_build_array(),
    cast('2026-03-19 15:29:44.860985' as timestamp),
    cast('2026-03-19 07:34:11.835' as timestamp)
  ),
  (
    '云山水榭',
    array[
      'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/pois/989769cc-18fb-450f-9306-d1b361fb156a.jpg',
      'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/pois/b5464909-d099-42e8-a54a-c12f3bcd09a7.jpg'
    ],
    1,
    jsonb_build_array(),
    cast('2026-03-19 15:34:04.88307' as timestamp),
    cast('2026-04-08 06:47:26.832' as timestamp)
  ),
  (
    '云山咖啡',
    array[
      'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/pois/7f16e83c-22c9-4719-9acc-a3dc2b001f63.jpg',
      'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/pois/08d662c1-b7dd-4e9b-a6c1-ed3685151321.jpg'
    ],
    2,
    jsonb_build_array(),
    cast('2026-04-15 16:58:34.812297' as timestamp),
    cast('2026-04-15 08:58:45.892' as timestamp)
  ),
  (
    '贝岗CommonHouse',
    cast(array[] as text[]),
    2,
    jsonb_build_array(),
    cast('2026-04-15 16:58:34.812297' as timestamp),
    cast('2026-04-15 08:58:45.892' as timestamp)
  )
on conflict (id) do update
set
  gallery = excluded.gallery,
  per_time_window_cap = excluded.per_time_window_cap,
  availability_rules = excluded.availability_rules,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into config (
  key,
  value
)
values
  (
    'home_page_wechat_qr_code',
    'https://oss-app.partner-up.cn/support/8f52443c-5546-4f1a-8f7d-035d929bde10.png'
  ),
  (
    'wechat_official_account_qr_code',
    'https://oss-app.partner-up.cn/support/qrcode_for_gh_2dce58a6fb41_258.jpg'
  ),
  (
    'wecom_service_qr_code',
    'https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg'
  ),
  (
    'wecom_staff_link',
    'https://work.weixin.qq.com/ca/cawcdeaeb65ab3d47f'
  ),
  (
    'wecom_support_link_wechat_in',
    'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
  ),
  (
    'wecom_support_link_wechat_out',
    'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
  )
on conflict (key) do update
set
  value = excluded.value;
