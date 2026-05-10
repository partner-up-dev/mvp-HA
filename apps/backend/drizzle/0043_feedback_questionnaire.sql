create table if not exists "feedback_questionnaire_templates" (
  "id" bigserial primary key,
  "key" text not null,
  "version" text not null,
  "title" text not null,
  "definition" jsonb not null,
  "created_at" timestamp not null default now(),
  "updated_at" timestamp not null default now()
);

create unique index if not exists "feedback_questionnaire_templates_key_version_uq"
  on "feedback_questionnaire_templates" ("key", "version");

create table if not exists "feedback_questionnaire_instances" (
  "id" bigserial primary key,
  "template_id" bigint references "feedback_questionnaire_templates" ("id") on delete set null,
  "title" text not null,
  "definition" jsonb not null,
  "created_at" timestamp not null default now(),
  "updated_at" timestamp not null default now()
);

create table if not exists "feedback_questionnaire_responses" (
  "id" bigserial primary key,
  "instance_id" bigint not null references "feedback_questionnaire_instances" ("id") on delete cascade,
  "respondent_user_id" uuid not null references "users" ("id") on delete cascade,
  "answers" jsonb not null,
  "submitted_at" timestamp not null default now(),
  "updated_at" timestamp not null default now()
);

create unique index if not exists "feedback_questionnaire_responses_instance_respondent_uq"
  on "feedback_questionnaire_responses" ("instance_id", "respondent_user_id");

alter table "anchor_events"
  add column if not exists "feedback_questionnaire_template_id" bigint
  references "feedback_questionnaire_templates" ("id") on delete set null;

alter table "partner_requests"
  add column if not exists "feedback_questionnaire_instance_id" bigint
  references "feedback_questionnaire_instances" ("id") on delete set null;
