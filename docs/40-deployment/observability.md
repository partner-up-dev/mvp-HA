# Observability

## Runtime Signals Available

### Function Runtime

- FC request metrics enabled
- FC instance metrics enabled
- logs written to configured Aliyun Log Service project/store

### Backend Health And Runtime Paths

- `/health` exposes basic HTTP health and job-runner status
- `/internal/maintenance/tick` is the operational entrypoint for due-job execution
- request-tail maintenance remains separate and short-budgeted

### Persisted Operational Signals

- `operation_logs` records domain action audit trail
- `jobs` records persisted scheduling semantics, including bucket resolution and early/late tolerance units
- `notification_deliveries` records notification send outcomes
- `telemetry_events` records raw product telemetry from frontend/backend sources
- `/api/analytics/*` exposes read/export-oriented product analytics derived from telemetry tables

## What To Watch

- migration failure before deploy
- job runner tick failures, backlog growth, or unexpected `MISSED` accumulation caused by bucket timing policy
- notification delivery failures, especially repeated rejection/error patterns
- OAuth/config-related failures in WeChat-dependent flows

## Current Gaps

- no in-repo BI/dashboard documentation for analytics exports
- no dedicated management UI yet for operation logs
- no documented centralized alerting policy in the repo
- `/internal/maintenance/tick` only avoids overlap inside one warm backend process today; cross-instance maintenance overlap is still possible until a DB-global coordination mechanism is added

Those gaps are real and should remain explicit rather than implied away.
