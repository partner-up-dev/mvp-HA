# System State And Authority

## Backend-Authoritative State

Persisted in Postgres via backend entities and repositories:

- `PartnerRequest` as the single durable PR record
- partner slots and participation state
- PR messages and per-user PR message inbox state
- users, user notification options, and user reliability
- anchor events, event-specific beta-group QR codes, landing rollout config, event-owned preset preference tags and moderation state, event-to-PR attachment records for assisted event context, time-pool strategy state, POIs, support resources, booking contacts, and booking execution records
- config, operation logs, domain events, outbox events, jobs, notification opportunities, notification waves, and notification deliveries
- analytics aggregate tables

This is the source of truth for product behavior.

## Backend-Derived Operational State

- outbox backlog and event-processing progress
- job leases, retries, due-job claims, and bucket-based scheduling semantics carried by `run_at`, `resolution_ms`, `early_tolerance_units`, and `late_tolerance_units`
- notification opportunity scheduling, wave state, send attempts, and cleanup state

These shape runtime behavior but remain backend-owned.

## Frontend Non-Authoritative State

- TanStack Query caches of backend data
- route-local UI state
- local message composer drafts and thread expansion/collapse state
- local and session storage for session tokens, user id/pin, admin tokens, pending WeChat actions, bookmark nudges, anchor-event landing mode stability, analytics session id, and `spm`
- active route-share session state, currently selected share descriptor, and replay bookkeeping for WeChat/browser share flows

This state improves UX and continuity but does not define product truth.

## Authority Boundary Rules

The backend is authoritative for:

- PartnerRequest and partner-slot state
- PR message visibility, read-marker progression, and notification wave gating
- identity binding, session verification, and role semantics
- event, time-pool, POI, booking-support, and admin-managed configuration state
- event-owned preference-tag pool, moderation state, landing recommendation, and event-assisted PR attachment truth
- event-specific beta-group QR codes; generic config must not be the owner for activity-specific beta-group entry
- domain events, notifications, analytics persistence, and operation logs

The frontend is authoritative for:

- route composition and page assembly
- UI-specific interaction state
- browser-side storage and pending-action continuity
- capability detection and fallback UX
- client-side caching and invalidation strategy
- active route-scoped share orchestration and replay of the current share descriptor

The frontend must not recreate or override backend domain rules as independent truth.

## Escalation Rule

Update Product TDD when a change affects:

- ownership of authoritative state
- backend/frontend error semantics relied on by flows
- authentication mode or token/cookie contract
- route-to-API coordination shape
- whether a responsibility stays inside one unit or becomes a shared contract
