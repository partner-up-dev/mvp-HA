create table if not exists "anchor_pr_booking_contacts" (
  "pr_id" bigint primary key references "partner_requests"("id") on delete cascade,
  "owner_partner_id" bigint not null references "partners"("id") on delete cascade,
  "owner_user_id" uuid not null references "users"("id") on delete cascade,
  "phone_e164" text not null,
  "phone_masked" text not null,
  "verified_source" text not null default 'WECHAT_SERVICE_ACCOUNT',
  "verified_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index if not exists "anchor_pr_booking_contacts_owner_user_idx"
  on "anchor_pr_booking_contacts" ("owner_user_id");
