create table if not exists "pr_messages" (
  "id" bigserial primary key,
  "pr_id" bigint not null references "partner_requests"("id") on delete cascade,
  "author_user_id" uuid not null references "users"("id") on delete cascade,
  "body" text not null,
  "created_at" timestamp not null default now()
);

create index if not exists "pr_messages_pr_id_created_at_idx"
  on "pr_messages" ("pr_id", "created_at", "id");

create index if not exists "pr_messages_author_user_id_idx"
  on "pr_messages" ("author_user_id");

create table if not exists "pr_message_inbox_states" (
  "pr_id" bigint not null references "partner_requests"("id") on delete cascade,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "last_read_message_id" bigint references "pr_messages"("id") on delete set null,
  "last_notified_message_id" bigint references "pr_messages"("id") on delete set null,
  "created_at" timestamp not null default now(),
  "updated_at" timestamp not null default now(),
  primary key ("pr_id", "user_id")
);

create index if not exists "pr_message_inbox_states_user_id_idx"
  on "pr_message_inbox_states" ("user_id");

alter table "user_notification_opts"
  add column if not exists "wechat_pr_message_opt_in" boolean not null default false;

alter table "user_notification_opts"
  add column if not exists "wechat_pr_message_opt_in_at" timestamp;

alter table "user_notification_opts"
  add column if not exists "wechat_pr_message_remaining_count" integer not null default 0;
