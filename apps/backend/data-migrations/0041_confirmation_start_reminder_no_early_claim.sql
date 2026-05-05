update "jobs"
set
  "resolution_ms" = 1,
  "early_tolerance_units" = 0,
  "early_tolerance_ms" = 0,
  "updated_at" = now()
where "job_type" = 'wechat.reminder.confirmation'
  and "status" in ('PENDING', 'RETRY')
  and "payload"->>'trigger' = 'CONFIRM_START';
