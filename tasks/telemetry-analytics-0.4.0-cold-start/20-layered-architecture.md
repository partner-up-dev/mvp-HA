# Target Layering

## Business State Tables

Purpose: authoritative application state.

Examples:

- `partner_requests`
- `partners`
- `notification_opportunities`
- `notification_deliveries`
- `jobs`

Rules:

- Backend use-cases write the state they own directly.
- New 0.4.0 async work should schedule jobs or notification opportunities from the initiating use-case.
- Analytics reads these tables for durable business facts such as created PR count, active partner count, waitlist state, notification delivery outcomes, and job outcomes.

## Operation Logs

Purpose: audit trail and operator-facing diagnosis.

Rules:

- Use operation logs for who-did-what audit semantics.
- Analytics can read operation logs for operator workflow metrics when needed.
- Operation logs should remain separate from user/product telemetry.

## `telemetry_events`

Purpose: raw product, UX, and o11y observations.

Examples:

- `page_view`
- `anchor_event_form_started`
- `anchor_event_recommendation_result`
- `event_assisted_create_result`
- `pr_join_result`
- `pr_waitlist_result`

Proposed row shape:

```text
id uuid primary key
type text not null
source text not null
session_id text null
user_id_hash text null
request_id text null
payload jsonb not null
occurred_at timestamp not null
received_at timestamp not null default now()
```

Recommended indexes:

- `(type, occurred_at)`
- `(session_id, occurred_at)`
- `(request_id)` when present
- expression or generated indexes can wait until BI query patterns are known

Rules:

- Source can be `frontend`, `backend`, or a narrower source label if useful.
- Payload should preserve event-specific fields.
- Common context should be normalized consistently where possible: `eventId`, `prId`, `activityType`, `sourceQr` or `spm`, `locationType`, `timeType`, `actionResult`, `failureCode`, `failureReason`.
- Failure reason should prefer stable codes. Human messages can be included as secondary context when already available.
- Privacy-sensitive user linkage should use a backend-issued hash or be omitted in 0.4.0 until the user-linkage policy is stable.
- Telemetry events serve observation, diagnosis, and BI raw-material use cases.
- Telemetry events should stay outside business side-effect and retry chains.

## Analytics Module

Purpose: metric definitions, read APIs, export boundaries, and BI semantic ownership.

Primary sources:

- business state tables
- `telemetry_events`
- `operation_logs`
- jobs and notification tables

Rules:

- `/api/analytics/*` is the application-facing analytics read boundary.
- Analytics-owned query functions and export jobs are the BI-facing boundary.
- Metric definitions should live in backend analytics code, close to the query and export implementation.
- Metrics should use stable semantic names and avoid leaking UI component names into BI meaning.
- The current daily aggregate tables are removed in 0.4.0.
- Analytics does not read `domain_events` after the 0.4.0 cleanup.

## Removed Surfaces: `domain_events` And `outbox_events`

Current role:

- Existing code writes business event records and outbox delivery records for some notification and side-effect paths.
- Current frontend analytics ingestion writes `analytics.*` rows into `domain_events`.

0.4.0 target:

- Move raw frontend/product telemetry out of `domain_events` into `telemetry_events`.
- Remove frontend telemetry writes to `domain_events`.
- Replace the live outbox side-effect dependency with direct job or notification scheduling.
- Remove `outbox_events`, `domain_events`, event/outbox entities, and event/outbox infra.
- Use jobs and notification opportunities directly for async behavior.
- Remove notification foreign keys that point at `domain_events`; keep source correlation as explicit text fields when useful.
- Remove request-tail and maintenance-tick outbox draining.

Implementation note:

- Code search shows the registered outbox handler currently handles `pr.message_created`.
- Other `writeToOutbox` calls should be verified before deletion, then removed when they have no live handler dependency.

## Migration Shape

1. Drop current daily aggregate tables: `analytics_daily_anchor`, `analytics_daily_community`, and `scenario_type_metrics`.
2. Remove daily aggregate service/job registration and bootstrap.
3. Replace live outbox side-effect dependencies with direct job or notification scheduling.
4. Remove notification FKs that reference `domain_events`.
5. Drop `outbox_events`.
6. Drop `domain_events`.
7. Remove event/outbox entities and infra.
8. Add `telemetry_events` entity and migration.
9. Move `/api/telemetry/events` persistence to `telemetry_events`.
10. Remove `/api/analytics/events` ingest compatibility.
11. Establish `/api/analytics/*` as the read/query boundary.

## Open Decisions Before Implementation

- Whether `user_id_hash` is produced on the backend ingest path from session/auth context or omitted in 0.4.0.
- Whether the frontend event name type should be renamed from `AnalyticsEventName` to a telemetry-oriented name during this slice.
- Whether `source_qr` should be derived from `spm`, a dedicated QR query parameter, or both.
- Whether `/er/:eventId` is part of this implementation slice or a separate Form Mode routing slice.
- Whether notification source correlation should use `sourceKind/sourceId`, `sourceRef`, or no source pointer after removing `domain_events`.
- Whether success events are deleted immediately as result events land, or replaced in one frontend taxonomy commit.
