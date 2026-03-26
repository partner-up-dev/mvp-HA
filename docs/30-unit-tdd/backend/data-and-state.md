# Backend Data And State

## Authoritative State

Authoritative product state is stored in backend-managed database tables, including:

- PR records and partner slots
- users, roles, notification opts, and reliability stats
- anchor events, batches, POIs, support resources, and booking contacts
- config and metadata-supporting state

## Operational State

- jobs table for delayed and due work
- domain/outbox events for eventual side effects
- notification deliveries and operation logs
- analytics events and aggregate tables

## State Handling Rules

- reads that depend on temporal truth may trigger lazy refresh behavior before returning
- request-tail processing may advance outbox and jobs opportunistically
- signed tokens/cookies encode session context, but user/business truth remains in persisted backend state

## Non-Authoritative State

- transient in-request data
- best-effort in-memory timing guards such as request-tail rate limiting

These improve execution but are not durable product truth.
