alter table "jobs"
  add column if not exists "resolution_ms" integer;

alter table "jobs"
  add column if not exists "early_tolerance_units" integer;

alter table "jobs"
  add column if not exists "late_tolerance_units" integer;

update "jobs"
set
  "resolution_ms" = coalesce("resolution_ms", 1),
  "early_tolerance_units" = coalesce(
    "early_tolerance_units",
    greatest("early_tolerance_ms", 0)
  ),
  "late_tolerance_units" = coalesce(
    "late_tolerance_units",
    case
      when "late_tolerance_ms" = -1 then -1
      else greatest("late_tolerance_ms", 0)
    end
  )
where "resolution_ms" is null
   or "early_tolerance_units" is null
   or "late_tolerance_units" is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_resolution_ms_check'
  ) then
    alter table "jobs"
      add constraint "jobs_resolution_ms_check"
      check ("resolution_ms" is null or "resolution_ms" > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_early_tolerance_units_check'
  ) then
    alter table "jobs"
      add constraint "jobs_early_tolerance_units_check"
      check (
        "early_tolerance_units" is null
        or "early_tolerance_units" >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_late_tolerance_units_check'
  ) then
    alter table "jobs"
      add constraint "jobs_late_tolerance_units_check"
      check (
        "late_tolerance_units" is null
        or "late_tolerance_units" = -1
        or "late_tolerance_units" >= 0
      );
  end if;
end
$$;
