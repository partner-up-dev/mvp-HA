# Unit Topology

## Technical Units

### Backend Unit

Code container: `apps/backend`

Owns:

- HTTP API surface
- domain rules and state transitions
- persistence
- auth/session verification
- background jobs and outbox processing
- integration with WeChat, WeCom, LLM, analytics, and operational configuration

### Frontend Unit

Code container: `apps/frontend`

Owns:

- route entrypoints and page composition
- browser-side workflow orchestration
- typed RPC consumption
- local persistence for session and pending browser actions
- environment-aware UX for share, WeChat auth, and client-side fallbacks

## Support Containers That Are Not Separate Technical Units

- repo root scripts and workflows under `scripts/` and `.github/`
- documentation under `docs/`
- deployment descriptors such as `apps/backend/s.yaml`

These shape delivery and operations but do not own independent product behavior.

## Internal Subsystem Clusters

Backend clusters:

- PR lifecycle: `pr-core`, `pr-community`, `pr-anchor`
- event and booking support: `anchor-event`, `pr-booking-support`
- identity and user: `auth`, `user`
- admin and operations: admin management domains, POI/config/meta
- cross-cutting infra: events, jobs, notifications, analytics, operation log

Frontend clusters:

- app/process layer: app bootstrap, router, auth bootstrap, WeChat processes
- domain layer: `pr`, `event`, `share`, `user`, `admin`, `support`, `landing`
- shared layer: generic UI, auth/session storage, analytics, API helpers
- page layer: route entrypoints

These are subsystem clusters inside units, not separate top-level technical units.
