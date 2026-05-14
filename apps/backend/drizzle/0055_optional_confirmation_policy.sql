alter table "partner_requests"
  add column if not exists "confirmation_enabled" boolean not null default true;

alter table "anchor_events"
  add column if not exists "default_confirmation_enabled" boolean not null default true;

alter table "partner_requests"
  drop constraint if exists "partner_requests_confirmation_policy_chk";

alter table "partner_requests"
  add constraint "partner_requests_confirmation_policy_chk" check (
    (
      "confirmation_start_offset_minutes" is null and
      "confirmation_end_offset_minutes" is null and
      "join_lock_offset_minutes" is null
    )
    or
    (
      "confirmation_enabled" = false and
      "confirmation_start_offset_minutes" is not null and
      "confirmation_end_offset_minutes" is not null and
      "join_lock_offset_minutes" is not null and
      "confirmation_start_offset_minutes" >= 0 and
      "confirmation_end_offset_minutes" >= 0 and
      "join_lock_offset_minutes" >= 0
    )
    or
    (
      "confirmation_enabled" = true and
      "confirmation_start_offset_minutes" is not null and
      "confirmation_end_offset_minutes" is not null and
      "join_lock_offset_minutes" is not null and
      "confirmation_start_offset_minutes" > "confirmation_end_offset_minutes" and
      "confirmation_end_offset_minutes" >= 0 and
      "join_lock_offset_minutes" >= "confirmation_end_offset_minutes"
    )
  );
