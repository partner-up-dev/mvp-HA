# Backend Design

## Internal Shape

The backend uses a domain-oriented layered architecture:

- controllers perform protocol conversion and validation
- use cases execute one business action each
- domain services hold reusable business rules
- repositories own CRUD/persistence
- entities define schema and exported backend types
- infra modules handle cross-cutting side effects

## Main Internal Clusters

- `pr-core`: lifecycle, temporal refresh, shared slot/status/time-window logic
- `pr-community` and `pr-anchor`: scene-specific use cases and reads
- `anchor-event` and `pr-booking-support`: event context and support-resource flows
- `user` and `auth`: account/session behavior
- `infra/*`: jobs, events/outbox, notifications, analytics, operation logs

## Design Rules

- controllers do not own business logic
- new business actions should prefer direct use-case imports over legacy service facades
- side effects that must survive retries or later processing should go through infra/event/job patterns rather than hidden controller logic
- scale-to-zero constraints rule out naive in-memory schedulers as the primary mechanism
