# Task Packet - Anchor Event Admin-Only PR Creation

- Objective & Hypothesis: let each Anchor Event choose whether users can create PRs for that activity type. Hypothesis: an event-owned creation policy can hide event-assisted creation surfaces and block public create/edit command paths that target an admin-only event type, while Admin PR operations remain available.
- Input Type: Intent
- Active mode: Execute
- Durable owner: Anchor Event product policy plus PR creation command boundaries.

## Guardrails Touched

- PRD Anchor Event browsing and assisted-create workflows.
- Product TDD PR creation contract and Anchor Event public read payloads.
- Backend Anchor Event entity, migration, admin management input/output, public create/edit guards.
- Frontend Anchor Event surfaces in Form, Card, and List modes.
- Admin Anchor Event editor and Admin PR workspace type suggestions.

## Scope

- Add `prCreationPolicy` to Anchor Event with default `USER_AND_ADMIN`.
- Add `ADMIN_ONLY` policy that blocks user-created PRs matching the event type through event-assisted create, structured create, natural-language create, and user PR content edits.
- Keep Admin PR create/edit allowed for admin-only event types.
- Keep `publishPR` unchanged.
- Keep `expandFullPR` unchanged because that function is planned for removal.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm test:scenario backend` passed, including public structured create block, user content retarget block, and Admin PR create/edit allowance for `ADMIN_ONLY`.
- Frontend RPC consumers compile with the new Anchor Event payload fields through the build.
