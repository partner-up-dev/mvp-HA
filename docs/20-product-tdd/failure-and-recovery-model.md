# Failure And Recovery Model

## Browser Or API Failure

- frontend treats backend as authoritative and surfaces failures through query/mutation error handling
- unsupported client capabilities fall back where possible, such as Web Share to copy-link

## Auth And Environment Failure

- backend distinguishes auth-required and config-missing conditions through status/code
- frontend redirects or degrades UX based on those backend signals rather than precomputing all gating locally

## Background Work Failure

- outbox and job execution are best-effort within request-tail budget
- external schedulers may call `/internal/jobs/tick` to advance due work
- failed jobs/events should be recoverable by retry or later tick rather than assuming an always-on worker

## Notification Failure

- notification delivery attempts are persisted
- user rejection signals such as `43101` feed back into backend-owned notification quota cleanup

## Data And Migration Failure

- schema/data migrations are forward-only
- deploy does not continue if migration fails
- remediation happens by fixing forward state, not by destructive rollback assumptions
