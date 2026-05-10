alter table "partners"
  add column if not exists "alternative_pr_reminder_opt_in" boolean not null default false,
  add column if not exists "alternative_pr_reminder_opted_in_at" timestamp;

alter table "user_notification_opts"
  add column if not exists "wechat_waitlist_alternative_available_opt_in" boolean not null default false,
  add column if not exists "wechat_waitlist_alternative_available_opt_in_at" timestamp,
  add column if not exists "wechat_waitlist_alternative_available_remaining_count" integer not null default 0;
