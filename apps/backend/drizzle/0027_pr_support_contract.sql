alter table if exists "anchor_pr_support_resources"
  rename to "pr_support_resources";

alter index if exists "anchor_pr_support_resources_pr_order_idx"
  rename to "pr_support_resources_pr_order_idx";

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_support_resources_pr_id_partner_requests_id_fk'
  ) then
    execute 'alter table "pr_support_resources" rename constraint "anchor_pr_support_resources_pr_id_partner_requests_id_fk" to "pr_support_resources_pr_id_partner_requests_id_fk"';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_support_resources_source_event_support_resource_id_anchor_event_support_resources_id_fk'
  ) then
    execute 'alter table "pr_support_resources" rename constraint "anchor_pr_support_resources_source_event_support_resource_id_anchor_event_support_resources_id_fk" to "pr_support_resources_source_event_support_resource_id_anchor_event_support_resources_id_fk"';
  end if;
end $$;

alter table if exists "anchor_pr_booking_contacts"
  rename to "pr_booking_contacts";

alter index if exists "anchor_pr_booking_contacts_owner_user_idx"
  rename to "pr_booking_contacts_owner_user_idx";

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_contacts_pr_id_partner_requests_id_fk'
  ) then
    execute 'alter table "pr_booking_contacts" rename constraint "anchor_pr_booking_contacts_pr_id_partner_requests_id_fk" to "pr_booking_contacts_pr_id_partner_requests_id_fk"';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_contacts_owner_partner_id_partners_id_fk'
  ) then
    execute 'alter table "pr_booking_contacts" rename constraint "anchor_pr_booking_contacts_owner_partner_id_partners_id_fk" to "pr_booking_contacts_owner_partner_id_partners_id_fk"';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_contacts_owner_user_id_users_id_fk'
  ) then
    execute 'alter table "pr_booking_contacts" rename constraint "anchor_pr_booking_contacts_owner_user_id_users_id_fk" to "pr_booking_contacts_owner_user_id_users_id_fk"';
  end if;
end $$;

alter table if exists "anchor_pr_booking_executions"
  rename to "pr_booking_executions";

alter index if exists "anchor_pr_booking_executions_pr_id_idx"
  rename to "pr_booking_executions_pr_id_idx";

alter index if exists "anchor_pr_booking_executions_created_at_idx"
  rename to "pr_booking_executions_created_at_idx";

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_executions_pr_id_partner_requests_id_fk'
  ) then
    execute 'alter table "pr_booking_executions" rename constraint "anchor_pr_booking_executions_pr_id_partner_requests_id_fk" to "pr_booking_executions_pr_id_partner_requests_id_fk"';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_executions_target_resource_id_anchor_pr_support_resources_id_fk'
  ) then
    execute 'alter table "pr_booking_executions" rename constraint "anchor_pr_booking_executions_target_resource_id_anchor_pr_support_resources_id_fk" to "pr_booking_executions_target_resource_id_pr_support_resources_id_fk"';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'anchor_pr_booking_executions_actor_user_id_users_id_fk'
  ) then
    execute 'alter table "pr_booking_executions" rename constraint "anchor_pr_booking_executions_actor_user_id_users_id_fk" to "pr_booking_executions_actor_user_id_users_id_fk"';
  end if;
end $$;
