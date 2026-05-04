# Task Packet - 0.4.0 Telemetry And Analytics Cold Start

## Input Classification

- Intent: 0.4.0 needs cold-start L1:re2 instrumentation and a more durable BI foundation.
- Constraint: OTLP alignment is deferred for this slice. `booking_entry_click` is deferred for this slice.
- Constraint: 0.4.0 removes the existing daily aggregate tables and job.
- Constraint: 0.4.0 introduces explicit telemetry and analytics module boundaries.
- Constraint: critical command outcomes should use independent result events instead of only success events or click events.
- Constraint: jobs are the async execution primitive for new 0.4.0 work; telemetry/o11y events are observation data.
- Constraint: 0.4.0 removes `domain_events` and `outbox_events` together with their event/outbox infra.
- Constraint: 0.4.0 does not keep compatibility shims for `/api/analytics/events`, legacy frontend event names, or success/result event parallelism.
- Reality: Form Mode and PR Join changed recently. Current docs and code must be treated as source evidence before implementation.

## Objective & Hypothesis

Build the smallest 0.4.0 slice that can support cold-start L1:re2 BI while moving the event system toward maintainable telemetry, analytics, and async execution boundaries.

The hypothesis is that product telemetry, business state tables, operation logs, and jobs are enough for this stage. Analytics can read from those sources directly through owned query/export boundaries while Form Mode and PR Join continue to evolve.

## Guardrails Touched

- Product tracking contract: cold-start event names, result semantics, and required context fields.
- Frontend telemetry: `trackEvent`, event taxonomy, Form Mode flow telemetry, and reusable PR Join flow telemetry.
- Backend telemetry ingestion: `/api/telemetry/events`, event validation, persistence, and batch behavior.
- Backend async execution: new 0.4.0 async work should use `jobs` and existing notification scheduling primitives.
- Backend event/outbox removal: `domain_events`, `outbox_events`, and `infra/events` should be removed after replacing live side-effect dependencies.
- Analytics read/export boundary: `/api/analytics/*`, analytics-owned queries, and future export jobs should consume stable source tables.
- Analytics aggregate removal: existing daily aggregate tables and their job should be removed.
- Documentation: `docs/40-deployment/observability.md`, cross-unit contracts, and this task packet should remain aligned.

## Confirmed 0.4.0 Cold-Start Scope

- Add a Form Mode start event.
- Add independent result events for recommendation, event-assisted create, PR join, and waitlist when the shared join flow enters waitlist mode.
- Add result fields that cover `action_result` and `failure_reason` semantics on the critical paths.
- Preserve existing useful impression/click telemetry where it already exists.
- Move raw frontend product telemetry persistence out of `domain_events` into `telemetry_events`.
- Delete current daily aggregate tables: `analytics_daily_anchor`, `analytics_daily_community`, and `scenario_type_metrics`.
- Delete current daily aggregate service/job and bootstrap registration.
- Delete `domain_events`, `outbox_events`, event/outbox entities, and event/outbox worker/writer infra.
- Replace live outbox side-effect usage with direct job or notification scheduling.
- Establish frontend/backend module topology for telemetry and analytics.
- Keep analytics as metric/query/export owner over business tables, `telemetry_events`, jobs, notification tables, and operation logs.

## Deferred Scope

- OTLP/browser export alignment.
- `booking_entry_click`.
- Review submission telemetry.
- Manual intervention workflow telemetry.
- External analytics vendor integration.
- BI dashboard implementation.
- Backward compatibility for old frontend ingest/event names.
- Broader async workflow redesign beyond replacing the current outbox dependency needed to drop `domain_events`.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend db:lint`
- Search should prove no live backend `writeToOutbox`, `registerOutboxHandler`, `processOutboxBatch`, `domainEvents`, or `outboxEvents` references remain.
- Local DB migration applied `0039_telemetry_analytics_cleanup.sql`.
- Agent-browser E2E verified `/e/1?spm=codex_cold_start_e2e` emits `window.__PARTNER_UP_TELEMETRY_EVENTS__`, persists rows into `telemetry_events`, and returns cold-start analytics from `/api/analytics/cold-start/summary`.
- E2E observed `anchor_event_form_started`, `anchor_event_recommendation_result`, and `pr_join_result` for the same source attribution.

## Implementation Record

- Added `telemetry_events`, `/api/telemetry/events`, and backend `infra/telemetry`.
- Replaced `/api/analytics/events` ingestion with `/api/analytics/cold-start/summary` read/query ownership.
- Removed daily aggregate entities, service, job, and backend startup registration.
- Removed backend `domain_events`, `outbox_events`, `infra/events`, and live event/outbox use-case calls.
- Replaced the live PR-message notification outbox path with direct notification opportunity and job scheduling.
- Added frontend result taxonomy for recommendation, event-assisted create, PR join, and PR waitlist.
- Added Form Mode `anchor_event_form_started` and result telemetry with `actionResult`, `failureCode`, and `failureReason`.
- Kept `booking_entry_click` outside this 0.4.0 cold-start slice.
