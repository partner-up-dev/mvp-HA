# Observability

## Runtime Signals Available

### Function Runtime

- FC request metrics enabled
- FC instance metrics enabled
- logs written to configured Aliyun Log Service project/store

### Backend Health And Runtime Paths

- `/health` exposes basic HTTP health and job-runner status
- `/internal/maintenance/tick` is the operational entrypoint for outbox + due-job execution

### Persisted Operational Signals

- `operation_logs` records domain action audit trail
- `notification_deliveries` records notification send outcomes
- `domain_events` and `outbox_events` provide event-side-effect traceability
- analytics event ingestion and aggregate tables provide product/flow telemetry

## What To Watch

- migration failure before deploy
- outbox drain failures in request-tail logs
- job runner tick failures or backlog growth
- notification delivery failures, especially repeated rejection/error patterns
- OAuth/config-related failures in WeChat-dependent flows

## Current Gaps

- no in-repo BI/dashboard documentation for analytics aggregates
- no dedicated management UI yet for operation logs
- no documented centralized alerting policy in the repo
- `/internal/maintenance/tick` only avoids overlap inside one warm backend process today; cross-instance maintenance overlap is still possible until a DB-global coordination mechanism is added

Those gaps are real and should remain explicit rather than implied away.
