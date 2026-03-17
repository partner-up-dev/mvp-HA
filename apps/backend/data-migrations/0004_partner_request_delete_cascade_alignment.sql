-- Align delete-cascade semantics for partner-request hierarchy.
-- 1) Deleting partner_requests cascades to partners and anchor_pr_support_resources.
-- 2) Deleting anchor/community subtype rows cascades back to partner_requests.

alter table "partners"
  drop constraint if exists "partners_pr_id_partner_requests_id_fk";

alter table "partners"
  add constraint "partners_pr_id_partner_requests_id_fk"
  foreign key ("pr_id")
  references "public"."partner_requests"("id")
  on delete cascade
  on update no action;

alter table "anchor_pr_support_resources"
  drop constraint if exists "anchor_pr_support_resources_pr_id_partner_requests_id_fk";

alter table "anchor_pr_support_resources"
  add constraint "anchor_pr_support_resources_pr_id_partner_requests_id_fk"
  foreign key ("pr_id")
  references "public"."partner_requests"("id")
  on delete cascade
  on update no action;

create or replace function "public"."delete_partner_request_from_subtype"()
returns trigger
language plpgsql
as $$
begin
  -- When subtype row is deleted directly, remove its root partner_request as well.
  -- If root row is already gone (e.g. root-first cascade), this is a no-op.
  delete from "public"."partner_requests"
  where "id" = old."pr_id";
  return old;
end;
$$;

drop trigger if exists "anchor_partner_requests_delete_root_partner_request"
on "anchor_partner_requests";

create trigger "anchor_partner_requests_delete_root_partner_request"
after delete on "anchor_partner_requests"
for each row
execute function "public"."delete_partner_request_from_subtype"();

drop trigger if exists "community_partner_requests_delete_root_partner_request"
on "community_partner_requests";

create trigger "community_partner_requests_delete_root_partner_request"
after delete on "community_partner_requests"
for each row
execute function "public"."delete_partner_request_from_subtype"();
