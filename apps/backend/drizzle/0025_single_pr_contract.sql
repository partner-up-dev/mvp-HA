alter table "partner_requests"
  add column if not exists "budget" text;

update "partner_requests" as pr
set "budget" = cpr."budget"
from "community_partner_requests" as cpr
where pr."id" = cpr."pr_id"
  and pr."budget" is null;

alter table "anchor_event_batches"
  add column if not exists "earliest_lead_minutes" integer;

alter table "scenario_type_metrics"
  rename column "pr_kind" to "line_kind";

alter table "partner_requests"
  drop column if exists "pr_kind";

drop table if exists "community_partner_requests";
drop table if exists "anchor_partner_requests";
