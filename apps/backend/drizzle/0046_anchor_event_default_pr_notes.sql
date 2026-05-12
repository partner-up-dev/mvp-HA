alter table "anchor_events"
  add column if not exists "default_pr_notes" text;
