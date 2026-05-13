alter table users
  add column if not exists phone_number text;

update users
set phone_number = latest_contact.phone_e164
from (
  select distinct on (owner_user_id)
    owner_user_id,
    phone_e164
  from pr_booking_contacts
  where phone_e164 is not null
  order by owner_user_id, updated_at desc
) latest_contact
where users.id = latest_contact.owner_user_id
  and users.phone_number is null;

drop table if exists pr_booking_contacts;
