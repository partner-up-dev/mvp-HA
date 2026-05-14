# Issue 213 - Anchor Event participation frequency limit

## Objective & Hypothesis

Add an Anchor Event-owned participation frequency limit so operators can require
one user to wait through a configured number of complete event PRs before
joining or waitlisting another PR in the same Anchor Event.

Confirmed semantics:

- PR order is by event time-window start, then time-window end, then PR id.
- `intervalPrCount = 3` means three complete PRs after the user's current
  active participation remain blocked; the fourth PR is allowed.
- Only `JOINED`, `CONFIRMED`, and `ATTENDED` slots count as history.
- `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` do not count as history.
- Waitlist submission is subject to the same limit, while pending slots do not
  become limiting history.

## Guardrails Touched

- Durable product truth: PRD behavior rules.
- Cross-unit contract: Anchor Event admin config, PR join/waitlist command
  rejection, PR detail action blocking.
- Backend schema/migration: `anchor_events` config JSONB.
- Backend PR-core command guards: join and waitlist.
- Frontend admin and PR detail text rendering.

## Verification

- Backend scenario tests for join and waitlist command guards.
- Backend unit tests for partner-section blocking where useful.
- Backend lint/problem-details guard.
- Frontend unit/type/build as needed for RPC shape changes.

Completed:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend lint:problem-details`
- `pnpm db:lint`
- `pnpm exec vitest run apps/backend/tests/pr-core/pr-participation-frequency-limit.scenario.test.ts --project backend-scenario`
- `pnpm test:unit:backend`
- `pnpm build:backend`
- `pnpm build:frontend`
