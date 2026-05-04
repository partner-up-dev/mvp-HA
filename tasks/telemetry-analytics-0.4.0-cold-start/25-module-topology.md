# Module Topology

## Frontend Telemetry

```text
apps/frontend/src/shared/telemetry/
  events.ts
  track.ts
  context.ts
  result.ts
```

Responsibilities:

- Own raw telemetry event names and payload types.
- Add common context such as route path, `spm`, `sourceQr`, session id, and source surface.
- Queue and flush observations to `/api/telemetry/events`.
- Provide result helpers for `actionResult`, `failureCode`, and `failureReason`.
- Keep debug visibility through `window.__PARTNER_UP_TELEMETRY_EVENTS__`.

Business UI surfaces call `trackEvent(...)` and stay unaware of persistence details.

## Frontend Analytics

```text
apps/frontend/src/shared/analytics/
  client.ts
  types.ts
```

Responsibilities:

- Own application-facing analytics read clients for future dashboards or admin surfaces.
- Call `/api/analytics/*`.
- Keep BI/query response types separate from raw telemetry event payloads.

This module can be scaffolded when the first analytics read surface appears.

## Backend Telemetry

```text
apps/backend/src/entities/
  telemetry-event.ts

apps/backend/src/infra/telemetry/
  event-taxonomy.ts
  ingest.service.ts
  index.ts

apps/backend/src/controllers/
  telemetry.controller.ts
```

Responsibilities:

- Validate accepted telemetry event names and envelopes.
- Accept only 0.4.0 telemetry event names.
- Persist raw observations to `telemetry_events`.
- Preserve batch ingestion behavior for frontend transport.
- Keep `/api/telemetry/events` as the raw ingest endpoint.

## Backend Analytics

```text
apps/backend/src/infra/analytics/
  metrics.ts
  queries.ts
  export.service.ts
  index.ts

apps/backend/src/controllers/
  analytics.controller.ts
```

Responsibilities:

- Own metric definitions and query semantics.
- Read from business state tables, `telemetry_events`, `operation_logs`, jobs, and notification tables.
- Provide `/api/analytics/*` read endpoints for app/admin dashboards.
- Provide export/query functions for BI integration.
- Avoid daily aggregate tables in the 0.4.0 slice.

## Backend Async Execution

```text
apps/backend/src/infra/jobs/
apps/backend/src/entities/job.ts
apps/backend/src/entities/notification-*.ts
```

Responsibilities:

- Own delayed and retryable work for new 0.4.0 paths.
- Let use-cases schedule jobs or notification opportunities directly after state mutation.
- Keep telemetry and analytics out of business side-effect execution.

## Removed Event/Outbox Surfaces

```text
apps/backend/src/entities/domain-event.ts
apps/backend/src/entities/outbox-event.ts
apps/backend/src/infra/events/
```

0.4.0 cleanup:

- Replace the currently live `pr.message_created` outbox handler path with direct job or notification scheduling.
- Remove `domain-event.ts`, `outbox-event.ts`, and `infra/events`.
- Remove request-tail and maintenance-tick outbox draining.
- Remove notification foreign keys to `domain_events`.
- Keep jobs as the only retryable async execution primitive.
