alter table partner_requests
  add column if not exists meeting_point jsonb;

alter table anchor_events
  add column if not exists meeting_point jsonb,
  add column if not exists location_meeting_points jsonb not null default '{}'::jsonb;

alter table pois
  add column if not exists meeting_point jsonb;

alter table user_notification_opts
  add column if not exists wechat_meeting_point_updated_opt_in boolean not null default false,
  add column if not exists wechat_meeting_point_updated_opt_in_at timestamp,
  add column if not exists wechat_meeting_point_updated_remaining_count integer not null default 0;
