alter table "partners"
  add column if not exists "exited_at" timestamp;

alter table "partners"
  alter column "status" set default 'JOINED';

update "partners"
set "status" = 'EXITED',
    "exited_at" = coalesce("released_at", now())
where "status" = 'RELEASED'
  and "user_id" is not null;

delete from "partners"
where "user_id" is null;

alter table "partners"
  alter column "user_id" set not null;

alter table "partners"
  drop constraint if exists "partners_user_id_users_id_fk";

alter table "partners"
  add constraint "partners_user_id_users_id_fk"
  foreign key ("user_id") references "public"."users"("id")
  on delete cascade
  on update no action;
