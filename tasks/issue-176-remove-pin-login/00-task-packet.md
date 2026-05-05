# Issue 176 Retire User PIN Login

## Objective & Hypothesis

Retire user-facing PIN login, registration, recovery, and PR mutation confirmation while preserving anonymous user continuity through UUID-backed sessions.

Hypothesis:

- Anonymous visitors receive a durable `users.id` UUID and an anonymous JWT whose `role` claim is `anonymous`.
- Frontend stores the user UUID in localStorage and uses it to restore the anonymous session on return visits.
- Anonymous and authenticated sessions both travel through the `Authorization: Bearer <JWT>` request path.
- Session authorization semantics come from JWT claims and current user persistence state.
- Anonymous publish attempts for `DRAFT` PRs return a stable authenticated-required error code.
- Frontend uses the authenticated-required error code to start WeChat login and resume the pending publish action.
- `DRAFT` PR content edits are open to any current session, including anonymous sessions, with no creator ownership gate.
- `DRAFT` PRs may have `createdBy = null`; successful authenticated publish assigns `createdBy` to the publisher.
- Existing `users.pin_hash` remains available as an internal credential hash for service/admin login during this slice.

## Input Classification

- Input Type: `Intent`
- Active Mode: `Execute`
- Durable Owner:
  - Product behavior: `docs/10-prd/behavior/*` and `docs/10-prd/glossary.md`
  - Cross-unit contract: `docs/20-product-tdd/cross-unit-contracts.md` and `docs/20-product-tdd/system-state-and-authority.md`
  - Runtime implementation: backend auth/user/session, backend PR publish/content mutation, frontend auth bootstrap, frontend PR publish/pending WeChat action, and frontend account/profile UI.

## Confirmed Decisions

- Ordinary user PIN product behavior is retired.
- Admin/service credential handling may keep using `users.pin_hash` in this issue.
- `users.pin_hash` may later migrate to `users.password_hash` in a separate credential cleanup slice.
- Anonymous UUID publish receives `403` with a stable code that tells the frontend authentication is required.
- Frontend should react to that code by starting WeChat login and recording a pending publish action.
- `DRAFT` PR content edit has open session access.
- `DRAFT` PR status publish remains an authenticated action.
- Anonymous token and authenticated token share the same bearer-token transport.

## Initial Evidence

- Backend `/api/auth/session` currently supports PIN-backed recovery and lacks UUID-only anonymous restore.
- Backend anonymous registration already creates `role = "anonymous"` users with UUID ids.
- Backend `publishPR` already supports `createdBy = null` drafts and assigns `createdBy` on publish.
- Frontend currently stores `partner_up_user_pin`, sends `userPin` in session bootstrap, and exposes PIN login / PIN credential UI on `/me`.
- Frontend PR edit/status modals still ask anonymous creators for PIN.

## Guardrails Touched

- Auth/session contracts must keep bearer JWT transport coherent across anonymous and authenticated roles.
- Anonymous identity continuity must preserve the localStorage user UUID path that supports visitor continuity and analytics.
- WeChat OAuth handoff must remain the authenticated upgrade path and keep existing handoff-cookie constraints.
- PR publish ownership must stay backend-authoritative.
- Frontend must use backend error codes for auth escalation instead of inferring publish eligibility locally.
- Service/admin login must keep a valid credential path while ordinary user PIN behavior is retired.
- Draft content edit openness applies only to `DRAFT` content mutation; published PR content/status mutation remains creator-governed.

## Implementation Slices

1. Durable docs
   - Update PRD identity vocabulary and workflows from user PIN continuity to anonymous UUID continuity plus WeChat authenticated publish.
   - Update Product TDD session/localStorage contract and publish/auth escalation contract.
2. Backend auth/session
   - Change `/api/auth/session` to accept UUID-only anonymous restore.
   - Keep JWT bearer transport for both anonymous and authenticated roles.
   - Remove ordinary user PIN login and local-registration response surfaces from user-facing contracts.
3. Backend PR rules
   - Return a stable authenticated-required code when anonymous users publish `DRAFT` PRs.
   - Keep `createdBy = null` draft creation and authenticated publish assignment.
   - Allow any session to edit `DRAFT` content.
   - Remove PR mutation PIN payload handling from ordinary user paths.
4. Frontend auth/session
   - Remove stored user PIN from session storage and store state.
   - Bootstrap anonymous sessions by stored user UUID.
   - Remove PIN login/register account queries and `/me` PIN UI.
5. Frontend PR flows
   - Handle publish authenticated-required code by recording pending publish and starting WeChat login.
   - Resume pending publish after WeChat login completes.
   - Remove PIN fields from edit/status modals and PR action payloads.
6. Verification and cleanup
   - Add focused backend tests for UUID anonymous restore, anonymous publish rejection code, authenticated publish creator assignment, and draft content edit openness.
   - Run backend/frontend typecheck or build and relevant scenario coverage.

## Verification Plan

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend test:unit`
- `pnpm --filter @partner-up-dev/backend test:scenario`
- `pnpm --filter @partner-up-dev/backend db:lint`
- Manual verification:
  - first anonymous visit creates and stores a UUID-backed anonymous session
  - return visit restores the same anonymous UUID through bearer JWT
  - anonymous `DRAFT` publish triggers WeChat login path through a stable code
  - authenticated resumed publish assigns `createdBy` to the publisher
  - anonymous session can edit `DRAFT` content
  - `/me` exposes UUID continuity and no ordinary user PIN UI

## Execution Log

- 2026-05-05: Explored issue #176 and confirmed scope with the user.
- 2026-05-05: User confirmed bearer JWT transport applies to both anonymous and authenticated sessions.
- 2026-05-05: User confirmed anonymous UUID publish returns authenticated-required 403 and frontend should use the code for WeChat login.
- 2026-05-05: User confirmed `DRAFT` content edit is open to any session.
- 2026-05-05: User confirmed `users.pin_hash` may remain for admin/service credential handling in this slice.
- 2026-05-05: Created this task packet only; implementation remains pending explicit start.
- 2026-05-05: User asked to start implementation and record implementation friction here.
- 2026-05-05: Updated PRD and Product TDD identity/session contracts from user PIN continuity to anonymous UUID continuity plus authenticated publish escalation.
- 2026-05-05: Implemented backend UUID-only anonymous session restore, removed ordinary user PIN login/registration routes, preserved `users.pin_hash` for service/admin credentials through a renamed credential verifier.
- 2026-05-05: Removed legacy local-credential headers from backend auth/CORS surfaces so user session transport stays on JSON body plus `Authorization: Bearer <JWT>`.
- 2026-05-05: Implemented backend PR rules for authenticated publish assignment, anonymous publish `AUTHENTICATED_REQUIRED`, and open `DRAFT` content edit.
- 2026-05-05: Implemented frontend PIN surface removal, UUID-based session bootstrap, authenticated-required publish escalation, pending publish replay after WeChat handoff, and visible `DRAFT` content edit entry for any session.
- 2026-05-05: Added frontend legacy localStorage cleanup for the retired `partner_up_user_pin` key.
- 2026-05-05: Added backend scenario coverage for anonymous UUID restore, anonymous publish rejection code, authenticated publish creator assignment, and anonymous `DRAFT` content edit.
- 2026-05-05: Verified backend typecheck, backend build, frontend build, frontend token lint, backend unit tests, backend scenario tests, and db lint. Scenario tests required explicitly passing the local `SCENARIO_DATABASE_ADMIN_URL` from `apps/backend/.env`.

## Implementation Friction

- Source search still finds `pin_hash` in the user schema, repository, and admin seed SQL. This is within the confirmed service/admin credential scope for this slice.
- The internal hash helper still uses the legacy file name `gen-pin-hash.py`, with prompt text changed to credential language.
- Frontend source intentionally keeps the legacy `partner_up_user_pin` string only to remove stale browser storage during session access.
- Historical task packets and generated backend `dist-*` output still mention PIN. They are excluded from source verification for issue #176 behavior because they are historical or generated artifacts.
