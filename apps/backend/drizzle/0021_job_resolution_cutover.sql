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

alter table "jobs"
  alter column "resolution_ms" set not null;

alter table "jobs"
  alter column "early_tolerance_units" set not null;

alter table "jobs"
  alter column "late_tolerance_units" set not null;
