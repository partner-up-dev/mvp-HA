alter table "user_notification_opts"
  add column if not exists "wechat_activity_start_reminder_opt_in" boolean not null default false;

alter table "user_notification_opts"
  add column if not exists "wechat_activity_start_reminder_opt_in_at" timestamp;

alter table "user_notification_opts"
  add column if not exists "wechat_activity_start_reminder_remaining_count" integer not null default 0;
