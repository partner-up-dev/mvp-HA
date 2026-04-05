create index if not exists "outbox_events_pending_claim_idx"
  on "outbox_events" ("id")
  where "status" = 'PENDING';
