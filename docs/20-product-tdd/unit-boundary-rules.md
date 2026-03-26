# Unit Boundary Rules

## Backend Authority

The backend is authoritative for:

- PartnerRequest and Partner slot state
- user identity binding, session verification, and role semantics
- event, POI, booking-support, and admin-managed configuration state
- domain events, notification jobs, analytics persistence, and operation logs
- share artifact generation and public config reads

The frontend must not recreate or override these rules as independent truth.

## Frontend Authority

The frontend is authoritative for:

- route composition and page assembly
- UI-specific interaction state
- local/session storage of browser-side session context and pending actions
- browser capability detection and fallback UX
- client-side caching and invalidation strategy

The frontend is not authoritative for domain transitions or eligibility rules.

## Cross-Unit Change Rule

Escalate to Product TDD when a change affects:

- ownership of authoritative state
- backend/frontend error semantics relied on by flows
- authentication mode or token/cookie contract
- route-to-API coordination shape
- whether a responsibility remains internal to one unit or becomes a shared contract

## Keep Local When

Keep a decision in Unit TDD when it only affects:

- internal module layout
- local adapter composition
- non-shared implementation detail
- purely local operational practice that does not shape another unit
