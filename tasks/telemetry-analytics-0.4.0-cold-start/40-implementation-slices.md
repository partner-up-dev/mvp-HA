# Implementation Slices

## Slice 1: Contract And Topology Solidification

Status: implemented for 0.4.0 cold-start scope.

Owner surfaces:

- `tasks/telemetry-analytics-0.4.0-cold-start/*`
- `docs/40-deployment/observability.md`
- relevant cross-unit contracts if the event contract becomes durable product/technical truth

Work:

- Confirm the cold-start event list and payload fields.
- Confirm the `sourceQr` derivation rule.
- Confirm the 0.4.0 treatment of `userIdHash`.
- Confirm removal of `/api/analytics/events`, legacy frontend event names, and success/result parallelism.
- Confirm `domain_events` and `outbox_events` deletion scope.
- Update docs to reflect telemetry ingest, analytics read/export, and jobs as the async primitive.

Verification:

- Tracking plan review.
- Topology review.
- Type-level event map update plan.
- Drop-scope review for all current `domain_events` and `outbox_events` references.

## Slice 2: Remove Existing Daily Aggregates

Status: implemented; verification passed through backend typecheck and db:lint.

Owner surfaces:

- `apps/backend/src/entities/analytics-daily-anchor.ts`
- `apps/backend/src/entities/analytics-daily-community.ts`
- `apps/backend/src/entities/scenario-type-metric.ts`
- `apps/backend/src/infra/analytics/aggregate-daily.service.ts`
- `apps/backend/src/infra/analytics/aggregate-daily.job.ts`
- `apps/backend/src/infra/analytics/index.ts`
- `apps/backend/src/index.ts`
- `apps/backend/drizzle/*`

Work:

- Add a forward migration that drops `scenario_type_metrics`, `analytics_daily_community`, and `analytics_daily_anchor`.
- Remove aggregate entity exports.
- Remove daily aggregate service and job.
- Remove analytics aggregate register/bootstrap from backend startup.
- Update observability docs that mention aggregate tables.

Verification:

- Backend typecheck.
- Migration lint/check.
- Search proves `analytics.aggregate.daily`, `analyticsDailyAnchor`, `analyticsDailyCommunity`, and `scenarioTypeMetrics` have no live references.

## Slice 3: Replace Live Outbox Side Effects

Status: implemented for the live PR-message notification dependency.

Owner surfaces:

- `apps/backend/src/domains/notification/use-cases/handle-domain-event.ts`
- `apps/backend/src/domains/notification/outbox-handlers.ts`
- `apps/backend/src/domains/pr/message/create-pr-message.ts`
- `apps/backend/src/domains/notification/services/pr-message-unread-wave.service.ts`
- job and notification scheduling services touched by the direct replacement

Work:

- Replace the current `pr.message_created` outbox handler path with direct job or notification scheduling from the message creation use-case.
- Preserve unread message wave dedupe and scheduling semantics.
- Remove outbox handler registration from backend startup.
- Verify all remaining `writeToOutbox` calls have no live side-effect dependency before deletion.

Verification:

- Notification/message tests prove unread wave opportunities and jobs are still created.
- Search proves `registerOutboxHandler` has no live usage after replacement.

## Slice 4: Drop `domain_events` And `outbox_events`

Status: implemented; runtime search has no live backend references.

Owner surfaces:

- `apps/backend/src/entities/domain-event.ts`
- `apps/backend/src/entities/outbox-event.ts`
- `apps/backend/src/entities/notification-opportunity.ts`
- `apps/backend/src/entities/notification-wave.ts`
- `apps/backend/src/infra/events/*`
- `apps/backend/src/infra/maintenance/*`
- `apps/backend/src/index.ts`
- `apps/backend/drizzle/*`

Work:

- Remove notification FKs to `domain_events`; keep source correlation as explicit non-FK fields if needed.
- Remove request-tail and external maintenance outbox draining.
- Remove event/outbox entities and exports.
- Remove `infra/events` event bus, outbox writer, outbox worker, and event types.
- Remove all `eventBus.publish` and `writeToOutbox` calls.
- Add a forward migration that drops `outbox_events` before `domain_events`.

Verification:

- Backend typecheck.
- Migration lint/check.
- Search proves no `domainEvents`, `outboxEvents`, `eventBus`, `writeToOutbox`, `processOutboxBatch`, or `registerOutboxHandler` references remain.
- Maintenance tick tests or smoke checks prove job ticking still works without outbox summary.

## Slice 5: Add `telemetry_events`

Status: implemented with migration `0039_telemetry_analytics_cleanup.sql`.

Owner surfaces:

- `apps/backend/src/entities/telemetry-event.ts`
- `apps/backend/src/entities/index.ts`
- `apps/backend/drizzle/*`

Work:

- Add Drizzle entity for `telemetry_events`.
- Add migration with core indexes.
- Export the entity from backend entities index.

Verification:

- Backend typecheck.
- Migration lint/check.
- Insert shape is compatible with cold-start result event payloads.

## Slice 6: Build Telemetry Ingestion

Status: implemented through `/api/telemetry/events`.

Owner surfaces:

- `apps/backend/src/controllers/telemetry.controller.ts`
- `apps/backend/src/infra/telemetry/*`
- `apps/backend/src/controllers/analytics.controller.ts`
- `apps/backend/src/infra/analytics/*`

Work:

- Move accepted frontend event taxonomy into `infra/telemetry`.
- Persist accepted frontend events to `telemetry_events`.
- Keep `/api/telemetry/events` as the raw ingest endpoint.
- Remove `/api/analytics/events` ingest endpoint.
- Remove legacy backend event type canonicalization.

Verification:

- Ingestion unit/integration tests.
- Manual POST to `/api/telemetry/events` in local dev if server verification is part of the slice.
- Query check proves new rows land in `telemetry_events`.

## Slice 7: Frontend Telemetry Taxonomy And Common Context

Status: implemented; frontend build passed.

Owner surfaces:

- `apps/frontend/src/shared/telemetry/events.ts`
- `apps/frontend/src/shared/telemetry/track.ts`
- optional `apps/frontend/src/shared/telemetry/context.ts`
- optional `apps/frontend/src/shared/telemetry/result.ts`

Work:

- Add result event types and payloads.
- Add Form Mode start event.
- Add common result fields with typed enums.
- Add shared helpers for source attribution and result classification.
- Remove legacy frontend event names and legacy event-name mapping.
- Replace success-only events with result events in the target cold-start paths.

Verification:

- Frontend typecheck.
- Debug queue shape inspection.

## Slice 8: Instrument Form Mode Results

Status: implemented; agent-browser E2E remains as final evidence.

Owner surfaces:

- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
- `apps/frontend/src/domains/event/ui/composites/FormModeNoMatchResult.vue` if entry-surface context needs to be passed through
- `apps/frontend/src/domains/event/queries/*` if result classification belongs closer to API responses

Work:

- Fire `anchor_event_form_started` once per active Form Mode journey.
- Fire `anchor_event_recommendation_result` on recommendation success/failure.
- Fire `event_assisted_create_result` on create fallback success/failure and pending auth replay.
- Include location/time type semantics using preset start options and current selected location source.

Verification:

- Focused frontend tests or manual journey with debug event queue.
- Failure path check with a mocked or forced API failure where practical.

## Slice 9: Instrument Shared Join/Waitlist Results

Status: implemented; agent-browser E2E remains as final evidence.

Owner surfaces:

- `apps/frontend/src/domains/pr/ui/composites/PRJoinFlow.vue`
- `apps/frontend/src/pages/PRPage.vue`
- Form Mode callers that can pass entry-surface context

Work:

- Fire `pr_join_result` and `pr_waitlist_result` from the shared flow.
- Classify gate-unresolved/auth-blocked/API-failed outcomes with stable codes.
- Pass entry surface and event context from PR detail and Form Mode callers.
- Remove success-only join/waitlist telemetry from the target paths.

Verification:

- Shared join flow tests or manual PR detail + Form Mode candidate paths.
- Check that all join surfaces emit one result event per submitted command.

## Slice 10: Analytics Read/Export Boundary

Status: implemented through `cold-start/summary` and export service.

Owner surfaces:

- `apps/backend/src/infra/analytics/*`
- `apps/backend/src/controllers/analytics.controller.ts`
- future `apps/frontend/src/shared/analytics/*` when a frontend read surface exists

Work:

- Define initial analytics query boundaries over business tables and `telemetry_events`.
- Keep metric definitions close to analytics query code.
- Provide an internal read/export seam for BI without restoring daily aggregate tables.
- Preserve `/api/analytics/*` for app-facing analytics reads.

Verification:

- Query smoke tests against seeded or local data.
- API contract test if a read endpoint is added.
- Export/query output review for cold-start L1:re2 metrics.

## Slice 11: End-To-End Verification

Status: completed for Form Mode start, recommendation result, persisted telemetry rows, analytics summary, and Form Mode candidate join result.

Work:

- Run backend and frontend typechecks/tests selected by touched files.
- Run migration verification.
- Exercise the cold-start happy path:
  - QR/source landing to `/e/:eventId`
  - Form Mode start
  - recommendation result matched or no-match
  - create fallback result or join result
- Exercise at least one failure/blocked path.

Evidence:

- Debug frontend event queue.
- Persisted `telemetry_events` rows.
- Analytics query/export output for the same source window.
- Backend search output proving removed event/outbox surfaces are gone.
