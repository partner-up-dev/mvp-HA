# Recovery

## Deployment Failure

- if migration fails, backend deploy must not continue
- recovery is forward-only: fix migration state or add a remediation migration, then redeploy

## Runtime Failure

- request-tail outbox/job processing is best-effort; later requests or explicit tick triggers can continue progress
- failed background work should be retried through job/outbox mechanisms rather than assuming a persistent worker process

## Notification Failure

- delivery failures are persisted
- user refusal signals such as `43101` should result in quota cleanup to avoid repeated failed sends

## Database Failure Model

- staging and production are forward-only
- non-transactional migrations must be restart-safe and explicitly marked
- local reset flows do not imply production recovery options

## Operational Recovery Entry Points

- rerun GitHub Actions deploy after fixing forward state
- use the job-runner trigger or internal tick path to resume due work
- inspect persisted logs/events/deliveries before assuming user-facing state has converged
