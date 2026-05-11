alter table "partner_requests"
  add column if not exists "visibility_status" text not null default 'VISIBLE',
  add column if not exists "confirmation_start_offset_minutes" integer,
  add column if not exists "confirmation_end_offset_minutes" integer,
  add column if not exists "join_lock_offset_minutes" integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_requests_confirmation_policy_chk'
  ) then
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
  end if;
end
$$;

update "partner_requests" as pr
set
  "visibility_status" = apr."visibility_status",
  "confirmation_start_offset_minutes" = apr."confirmation_start_offset_minutes",
  "confirmation_end_offset_minutes" = apr."confirmation_end_offset_minutes",
  "join_lock_offset_minutes" = apr."join_lock_offset_minutes"
from "anchor_partner_requests" as apr
where pr."id" = apr."pr_id";

drop table if exists "pr_partner_rules";
