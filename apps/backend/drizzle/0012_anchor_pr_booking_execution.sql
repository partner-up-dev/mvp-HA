create table if not exists "anchor_pr_booking_executions" (
  "id" bigserial primary key,
  "pr_id" bigint not null references "partner_requests" ("id") on delete cascade,
  "target_resource_id" bigint references "anchor_pr_support_resources" ("id") on delete set null,
  "target_resource_title" text not null,
  "booking_contact_phone" text,
  "actor_user_id" uuid not null references "users" ("id"),
  "result" text not null,
  "reason" text,
  "notification_target_count" integer not null default 0,
  "notification_success_count" integer not null default 0,
  "notification_failure_count" integer not null default 0,
  "notification_skipped_count" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "anchor_pr_booking_executions_pr_id_idx"
  on "anchor_pr_booking_executions" ("pr_id");

create index if not exists "anchor_pr_booking_executions_created_at_idx"
  on "anchor_pr_booking_executions" ("created_at");
