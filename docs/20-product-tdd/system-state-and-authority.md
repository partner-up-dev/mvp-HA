# System State And Authority

## Backend-Authoritative State

Persisted in Postgres via backend entities and repositories:

- PartnerRequest and scene-specific PR records
- partner slots and participation state
- users, user notification options, and user reliability
- anchor events, batches, POIs, support resources, booking contacts, and booking execution records
- config, operation logs, domain events, outbox events, jobs, and notification deliveries
- analytics aggregate tables

This is the source of truth for product behavior.

## Backend-Derived Operational State

- outbox backlog and event-processing progress
- job leases, retries, and due-job claims
- notification send attempts and cleanup state

These shape runtime behavior but remain backend-owned.

## Frontend Non-Authoritative State

- TanStack Query caches of backend data
- route-local UI state
- local and session storage for session tokens, user id/pin, admin tokens, pending WeChat actions, bookmark nudges, analytics session id, and `spm`

This state improves UX and continuity but does not define product truth.

## Authority Boundary Rules

The backend is authoritative for:

- PartnerRequest and partner-slot state
- identity binding, session verification, and role semantics
- event, POI, booking-support, and admin-managed configuration state
- domain events, notifications, analytics persistence, and operation logs

The frontend is authoritative for:

- route composition and page assembly
- UI-specific interaction state
- browser-side storage and pending-action continuity
- capability detection and fallback UX
- client-side caching and invalidation strategy

The frontend must not recreate or override backend domain rules as independent truth.

## Escalation Rule

Update Product TDD when a change affects:

- ownership of authoritative state
- backend/frontend error semantics relied on by flows
- authentication mode or token/cookie contract
- route-to-API coordination shape
- whether a responsibility stays inside one unit or becomes a shared contract
