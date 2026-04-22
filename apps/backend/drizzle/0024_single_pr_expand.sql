alter table "partner_requests"
  add column "visibility_status" text not null default 'VISIBLE',
  add column "confirmation_start_offset_minutes" integer,
  add column "confirmation_end_offset_minutes" integer,
  add column "join_lock_offset_minutes" integer;

alter table "partner_requests"
  add constraint "partner_requests_confirmation_policy_chk" check (
    (
      "confirmation_start_offset_minutes" is null and
      "confirmation_end_offset_minutes" is null and
      "join_lock_offset_minutes" is null
    )
    or
    (
      "confirmation_start_offset_minutes" is not null and
      "confirmation_end_offset_minutes" is not null and
      "join_lock_offset_minutes" is not null and
      "confirmation_start_offset_minutes" > "confirmation_end_offset_minutes" and
      "confirmation_end_offset_minutes" >= 0 and
      "join_lock_offset_minutes" >= "confirmation_end_offset_minutes"
    )
  );

update "partner_requests" as pr
set
  "visibility_status" = apr."visibility_status",
  "confirmation_start_offset_minutes" = apr."confirmation_start_offset_minutes",
  "confirmation_end_offset_minutes" = apr."confirmation_end_offset_minutes",
  "join_lock_offset_minutes" = apr."join_lock_offset_minutes"
from "anchor_partner_requests" as apr
where pr."id" = apr."pr_id";
