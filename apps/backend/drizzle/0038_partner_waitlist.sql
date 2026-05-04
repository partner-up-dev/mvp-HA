alter table "partners"
  add column if not exists "waitlisted_at" timestamp;

alter table "user_notification_opts"
  add column if not exists "wechat_waitlist_promoted_opt_in" boolean not null default false,
  add column if not exists "wechat_waitlist_promoted_opt_in_at" timestamp,
  add column if not exists "wechat_waitlist_promoted_remaining_count" integer not null default 0;
