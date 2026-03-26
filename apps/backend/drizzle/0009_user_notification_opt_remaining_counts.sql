alter table "user_notification_opts"
  add column if not exists "wechat_reminder_remaining_count" integer not null default 0;

alter table "user_notification_opts"
  add column if not exists "wechat_booking_result_remaining_count" integer not null default 0;

alter table "user_notification_opts"
  add column if not exists "wechat_new_partner_remaining_count" integer not null default 0;

update "user_notification_opts"
set
  "wechat_reminder_remaining_count" = case
    when "wechat_reminder_opt_in" then 1
    else 0
  end,
  "wechat_booking_result_remaining_count" = case
    when "wechat_booking_result_opt_in" then 1
    else 0
  end,
  "wechat_new_partner_remaining_count" = case
    when "wechat_new_partner_opt_in" then 1
    else 0
  end;
