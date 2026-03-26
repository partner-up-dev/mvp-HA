# System State And Authority

## Backend-Authoritative State

Persisted in Postgres via backend entities/repositories:

- PartnerRequest and scene-specific PR records
- Partner slots and participation state
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
- local/session storage for session tokens, user id/pin, admin tokens, pending WeChat actions, bookmark nudges, analytics session id, and `spm`

This state improves UX and continuity but does not define product truth.

## Authority Rule

If a rule changes who may act, when they may act, or what a PR/user/event state means, backend authority must change first and frontend must adapt second.
