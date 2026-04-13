alter table "anchor_event_batches"
  add column if not exists "description" text;
