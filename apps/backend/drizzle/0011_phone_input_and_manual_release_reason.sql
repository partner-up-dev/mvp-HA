alter table "partners"
  add column if not exists "release_reason" text;

alter table "anchor_pr_booking_contacts"
  alter column "verified_source" set default 'PHONE_INPUT_FORM';
