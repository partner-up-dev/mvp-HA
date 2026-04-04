-- Backfill legacy invalid partner bounds before boundary-only validation
-- starts rejecting new writes.

update "partner_requests"
set "min_partners" = 2
where "min_partners" is null
   or "min_partners" < 2;

update "partner_requests"
set "max_partners" = "min_partners"
where "max_partners" is not null
  and "max_partners" < "min_partners";

update "anchor_events"
set "default_min_partners" = 2
where "default_min_partners" is null
   or "default_min_partners" < 2;

update "anchor_events"
set "default_max_partners" = "default_min_partners"
where "default_max_partners" is not null
  and "default_max_partners" < "default_min_partners";
