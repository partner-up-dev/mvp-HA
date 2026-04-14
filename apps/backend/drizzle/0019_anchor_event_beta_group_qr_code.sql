alter table "anchor_events"
  add column if not exists "beta_group_qr_code" text;
