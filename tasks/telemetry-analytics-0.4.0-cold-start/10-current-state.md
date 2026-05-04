# Current State

## Frontend Telemetry Pipeline

- `apps/frontend/src/shared/telemetry/events.ts` owns 0.4.0 telemetry event names and typed payloads.
- `apps/frontend/src/shared/telemetry/track.ts` attaches route path, current `spm`, `sourceQr`, and session id, stores debug events in `window.__PARTNER_UP_TELEMETRY_EVENTS__`, and batches events to `/api/telemetry/events`.
- `apps/frontend/src/shared/telemetry/result.ts` centralizes `actionResult`, `failureCode`, and `failureReason` classification.
- Router-level page telemetry lives in `apps/frontend/src/app/router.ts` and emits `page_view`.

## Backend Telemetry And Analytics

- `apps/backend/src/controllers/telemetry.controller.ts` accepts raw telemetry batches at `/api/telemetry/events`.
- `apps/backend/src/infra/telemetry/event-taxonomy.ts` validates accepted 0.4.0 event names.
- `apps/backend/src/infra/telemetry/ingest.service.ts` persists raw observations into `telemetry_events`.
- `apps/backend/src/controllers/analytics.controller.ts` exposes read ownership through `/api/analytics/cold-start/summary`.
- `apps/backend/src/infra/analytics/*` owns metric definitions, query semantics, and export rows over `telemetry_events`.

## Removed Backend Surfaces

- Daily aggregate entities, service, job, and startup registration have been removed.
- `domain_events`, `outbox_events`, `infra/events`, event/outbox entities, worker, and writer have been removed from runtime code.
- The previous PR-message notification outbox path now schedules notification opportunities/jobs directly from the message creation path.
- `jobs` remains the async execution primitive for retryable backend work.

## Form Mode Evidence

- Local UI rules in `apps/frontend/src/domains/event/ui/AGENTS.md` say `/e/:eventId` owns the complete Form Mode journey: selection, recommendation result, matched handoff, no-match result, create fallback, and flow telemetry.
- `AnchorEventFormModeSurface.vue` now emits:
  - `anchor_event_form_impression`
  - `anchor_event_form_started`
  - `anchor_event_form_recommendation_impression`
  - `anchor_event_recommendation_result`
  - `anchor_event_form_result_action_click`
  - `anchor_event_form_create_fallback_click`
  - `event_assisted_create_result`
- Result payloads include `actionResult`, `failureCode`, and `failureReason` where the command outcome can fail or be blocked.

## PR Join Flow Evidence

- `docs/20-product-tdd/cross-unit-contracts.md` says PR detail, Form Mode matched handoff, Form Mode no-match candidate actions, and waitlist entry share a reusable PR-domain join flow.
- `apps/frontend/src/domains/pr/ui/composites/PRJoinFlow.vue` owns join gate modal orchestration, join/waitlist command execution, auth payload application, notification prompts, and result telemetry.
- `PRJoinFlow.vue` now emits `pr_join_result` and `pr_waitlist_result` with entry-surface and failure classification context.

## Dirty Worktree Note

The worktree already contains many modified and untracked files around Form Mode, join gates, waitlist, and PR page UX. Implementation should keep this telemetry slice isolated and avoid unrelated reversions.
