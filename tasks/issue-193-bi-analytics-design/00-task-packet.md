# Task Packet - Issue 193 BI Analytics Design

## Input Classification

- Intent: Issue #193 introduces a BI surface for marketing middle office and data dashboard work.
- Constraint: User-behavior collection can discard the existing implementation foundation.
- Constraint: Program-internal behavior collection belongs to a future implementation track, and this design should leave room for future OTLP-aligned correlation.
- Constraint: BI dashboard route is `/admin/analytics`.
- Constraint: Add `/bi?code=...` as a lightweight analytics entry that uses the code as the analytics user's pin, then redirects to `/admin/analytics`.
- Constraint: Backward compatibility is out of scope.
- Constraint: Analytics role is parallel to admin/service access.

## Objective & Hypothesis

Design the first BI dashboard slice around the Anchor Event -> PR conversion funnel, with separate funnel views for each Anchor Event landing mode.

Hypothesis: a rebuilt user telemetry model plus a narrow analytics-read surface can support the first BI dashboard while treating the 0.4.0 cold-start telemetry shape as reference evidence.

## Guardrails Touched

- Product behavior: Anchor Event landing modes, Form Mode recommendation, event-assisted PR creation, PR join and waitlist flows.
- Authorization: analytics role, admin role, analytics seed user, admin seed user analytics capability.
- Telemetry naming: user telemetry belongs under telemetry semantics.
- Analytics boundary: analytics reads telemetry and business state as an interpretation layer.
- Future observability: internal behavior collection should stay separable and OTLP-compatible.

## Current Scope

- Establish durable design for the first BI dashboard.
- Define the route and auth model for `/admin/analytics` and `/bi?code=...`.
- Define the user-behavior telemetry model needed for mode-separated Anchor Event -> PR funnels.
- Identify source business tables and telemetry events needed for BI queries.

## Future Scope

- Program-internal OTLP collection.
- Broader marketing middle-office workflows after the first BI dashboard funnel.
- Generic analytics dashboards after Anchor Event -> PR conversion is durable.

## Verification

- Design review against Anchor Event and PR product contracts.
- Route/auth review for analytics-only access.
- Tracking plan review proving each funnel step has an event or business-state source.
- Future implementation should include backend auth tests, analytics query tests, and frontend route access tests.

## Implementation Progress

2026-05-12:

- Slice 1 implemented: `users.role` changed to role arrays, auth/JWT now carries `roles`, seed admin gains analytics, analytics seed user added.
- Slice 2 implemented: backend `requireRoles(...)` added, service-owned admin APIs keep service access, analytics API requires analytics, frontend route meta uses `requiredRoles`.
- Slice 3 implemented: `/bi?code=...` logs in the hard-coded analytics seed user and redirects to `/admin/analytics`; failed login stays on `/bi` with a simple error and home action.
- Slice 4 implemented: `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events` added with ingest service and `/api/telemetry/user/events`.
- Slice 5 implemented: frontend telemetry now builds app journeys, anonymous ids, typed subject refs, dot event names, and command correlation ids for recommendation/create/join/waitlist.
- Slice 6 implemented: Anchor Event landing now starts a reusable `anchor_event_landing` business segment; FORM, CARD_RICH, and LIST modes emit mode-specific funnel events; downstream PR detail, create, join, and waitlist actions carry funnel attribution through journey/segment context and command correlation ids.
- Verification passed: `pnpm --filter @partner-up-dev/backend typecheck`, `pnpm --filter @partner-up-dev/frontend build`, `pnpm db:lint`, `pnpm --filter @partner-up-dev/backend test:unit`.
- Verification blocked: `pnpm test:scenario backend` needs `TEST_DATABASE_URL` or `SCENARIO_DATABASE_ADMIN_URL` in this environment.
