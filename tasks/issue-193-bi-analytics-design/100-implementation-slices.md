# Implementation Slices

## Execution Status

- 2026-05-12: Slices 1, 2, 3, 4, 5, and 6 implemented.
- 2026-05-13: Slice 7 implemented.
- Passed verification: `pnpm --filter @partner-up-dev/backend typecheck`, `pnpm --filter @partner-up-dev/backend test:unit`, `pnpm --filter @partner-up-dev/backend build`, `pnpm --filter @partner-up-dev/frontend build`, `pnpm db:lint`, `git diff --check`.
- Blocked verification: `pnpm test:scenario backend` requires `TEST_DATABASE_URL` or `SCENARIO_DATABASE_ADMIN_URL`.

## Slice 1: Auth Role Array Migration

Owner surfaces:

- `apps/backend/src/entities/user.ts`
- backend auth/JWT/session types
- seeds
- migrations

Work:

- Change `users.role` to a text array.
- Migrate existing users:
  - `anonymous` -> `["anonymous"]`
  - `authenticated` -> `["authenticated"]`
  - `service` -> `["service", "analytics"]` for the seed admin user
- Add the analytics seed user with `["analytics"]`.
- Update credential verification and auth issue paths to work with roles arrays.
- JWT carries `roles`.

Verification:

- backend typecheck
- migration lint
- auth unit tests for service, analytics, and ordinary users

## Slice 2: Role-Based Route And Middleware

Owner surfaces:

- backend auth middleware
- admin controllers
- analytics controller
- frontend router
- admin session storage

Work:

- Add generic backend `requireRoles(...)`.
- Replace admin route protection with `requireRoles(["service"])`.
- Protect analytics API with `requireRoles(["analytics"])`.
- Add frontend `requiredRoles` route meta.
- Keep admin session naming while storing roles.
- Gate `/admin/analytics` with `["analytics"]`.

Verification:

- backend route auth tests
- frontend route guard tests or focused manual verification

## Slice 3: `/bi` Entry Route

Owner surfaces:

- frontend router
- new `/bi` page
- admin login mutation/session application

Work:

- Add `/bi` route.
- Hard-code analytics seed user id in the page implementation.
- Read `code` from query.
- Submit `POST /api/auth/admin/login` with analytics user id and code.
- On success, store admin session and navigate to `/admin/analytics`.
- On failure, show simple error and home button.

Verification:

- frontend build
- browser smoke check for success and failure states

## Slice 4: User Telemetry Storage

Owner surfaces:

- backend entities
- migrations
- telemetry controller/ingest module

Work:

- Add `user_telemetry_journeys`.
- Add `user_telemetry_segments`.
- Add `user_telemetry_events`.
- Add indexes from `60-user-telemetry-envelope.md`.
- Build ingestion service for the new envelope.
- Keep telemetry naming aligned with user behavior telemetry.

Verification:

- backend typecheck
- migration lint
- ingest unit/integration tests

## Slice 5: Frontend Journey And Telemetry Client

Owner surfaces:

- frontend shared telemetry module
- router instrumentation
- action correlation helpers

Work:

- Generate and maintain `app_journey_id`.
- Persist journey metadata in session storage.
- Attach `anonymous_id`, `app_journey_id`, segment id, route, source, and typed subject fields.
- Generate command `correlation_id`.
- Send correlation id in request header and body for recommendation, create, join, and waitlist.
- Use dot-separated event names.

Verification:

- frontend build
- unit tests for journey lifecycle helpers
- browser debug queue inspection

## Slice 6: Anchor Event Funnel Instrumentation

Owner surfaces:

- `/e/:eventId` landing page
- FORM surface
- CARD_RICH surface
- LIST surface
- PR join/waitlist/create flows

Work:

- Emit events in `40-funnel-steps.md`.
- Create generic business segment for Anchor Event landing.
- Carry segment and journey context into downstream PR actions.
- Dedupe high-volume impressions per segment.

Verification:

- focused frontend tests where practical
- scenario or browser smoke for one journey per mode

## Slice 7: Analytics Query API

Owner surfaces:

- `apps/backend/src/infra/analytics`
- `apps/backend/src/controllers/analytics.controller.ts`

Work:

- Add `GET /api/analytics/anchor-event-funnel`.
- Implement aggregate response from `80-dashboard-query-contract.md`.
- Use `start_spm` for source breakdown.
- Use distinct `app_journey_id` for journey counts.

Verification:

- backend query tests with seeded telemetry rows
- API contract test

## Slice 8: `/admin/analytics` Page

Owner surfaces:

- frontend admin pages
- admin navigation card
- analytics query client
- i18n copy

Work:

- Add `/admin/analytics` route.
- Add role-filtered admin navigation entry.
- Build filters, KPI strip, mode comparison, per-mode funnel panels, outcome breakdown, source breakdown, and failure table.
- Call aggregate endpoint.

Verification:

- frontend build
- browser visual smoke
- role-gated navigation check

## Slice 9: Cross-Unit Scenario Verification

Owner surfaces:

- `tests/scenario`
- backend scenario builders
- frontend data-testid anchors

Work:

- Verify analytics-only login can reach `/admin/analytics`.
- Verify analytics-only user is routed away from service-owned admin pages.
- Verify one Anchor Event landing journey emits events and appears in the aggregate API.
- Verify one PR commitment is attributed back to mode funnel.

Verification:

- `pnpm test:scenario system` or focused scenario runner

## Slice 10: Documentation Promotion

Owner surfaces:

- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/40-deployment/observability.md`
- task packet

Work:

- Promote stable route/auth/telemetry/query contracts after implementation proof.
- Keep the task packet as detailed design and implementation record.

Verification:

- doc review against implemented behavior
