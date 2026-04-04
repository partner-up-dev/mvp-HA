alter table "notification_deliveries"
  add column if not exists "notification_kind" text;

alter table "notification_deliveries"
  add column if not exists "notification_trigger" text;

update "notification_deliveries"
set
  "notification_kind" = 'REMINDER_CONFIRMATION',
  "notification_trigger" = case
    when "reminder_type" = 'T_MINUS_24H' then 'CONFIRM_START'
    when "reminder_type" = 'T_MINUS_2H' then 'CONFIRM_END_MINUS_30M'
    else null
  end
where "notification_kind" is null;

alter table "notification_deliveries"
  alter column "notification_kind" set not null;

alter table "notification_deliveries"
  drop column "reminder_type";
