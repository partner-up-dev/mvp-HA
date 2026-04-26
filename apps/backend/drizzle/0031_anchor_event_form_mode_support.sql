create table "anchor_event_preference_tags" (
  "id" bigserial primary key not null,
  "anchor_event_id" bigint not null references "public"."anchor_events"("id") on delete cascade,
  "label" text not null,
  "description" text default '' not null,
  "status" text default 'PUBLISHED' not null,
  "created_at" timestamp default now() not null,
  "updated_at" timestamp default now() not null
);

create index "anchor_event_preference_tags_event_status_idx"
  on "anchor_event_preference_tags" ("anchor_event_id", "status");

create table "anchor_event_pr_attachments" (
  "pr_id" bigint primary key not null references "public"."partner_requests"("id") on delete cascade,
  "anchor_event_id" bigint not null references "public"."anchor_events"("id") on delete cascade,
  "created_at" timestamp default now() not null
);

create index "anchor_event_pr_attachments_event_idx"
  on "anchor_event_pr_attachments" ("anchor_event_id");
