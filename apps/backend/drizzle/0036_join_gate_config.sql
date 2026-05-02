alter table partner_requests
  add column if not exists join_gate_config jsonb not null default '[]'::jsonb;

alter table anchor_events
  add column if not exists join_gate_config jsonb not null default '[]'::jsonb;

alter table anchor_event_support_resources
  add column if not exists join_gate_config jsonb not null default '[]'::jsonb;

alter table pr_support_resources
  add column if not exists join_gate_config jsonb not null default '[]'::jsonb;

alter table pr_booking_contacts
  alter column owner_partner_id drop not null;

create table if not exists pr_join_notice_acceptances (
  pr_id bigint not null references partner_requests(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  gate_key text not null,
  gate_version text not null,
  accepted_at timestamp with time zone not null default now(),
  constraint pr_join_notice_acceptances_scope_uq unique (
    pr_id,
    user_id,
    gate_key,
    gate_version
  )
);
