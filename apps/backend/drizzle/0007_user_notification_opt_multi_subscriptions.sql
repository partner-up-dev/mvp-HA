alter table "user_notification_opts"
  add column if not exists "wechat_booking_result_opt_in" boolean not null default false;

alter table "user_notification_opts"
  add column if not exists "wechat_booking_result_opt_in_at" timestamp;

alter table "user_notification_opts"
  add column if not exists "wechat_new_partner_opt_in" boolean not null default false;

alter table "user_notification_opts"
  add column if not exists "wechat_new_partner_opt_in_at" timestamp;
