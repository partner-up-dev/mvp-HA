alter table "anchor_pr_support_resources"
  alter column "booking_deadline_at"
  type timestamp with time zone
  using "booking_deadline_at" at time zone 'UTC';
