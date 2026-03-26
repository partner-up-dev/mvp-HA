# Frontend Data And State

## Server-State Cache

TanStack Query caches backend-derived data for:

- PR detail and list reads
- event reads
- share-generation results
- admin data
- user/session-adjacent queries

These caches are not authoritative and must be invalidated after successful mutations.

## Local Persistent State

`localStorage` currently holds browser continuity state such as:

- user id, user pin, access token, and session role
- admin session fields
- pending WeChat action
- landing bookmark nudge state

## Session-Scoped State

`sessionStorage` currently holds:

- WeChat auto-login attempt markers
- analytics session id
- `spm` attribution continuation

## Authority Rule

Frontend local state exists to resume UX and avoid friction. It must not become the source of truth for PR lifecycle, participation, identity binding, or notification quota semantics.
