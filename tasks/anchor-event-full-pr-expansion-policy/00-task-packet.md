# Task Packet - Anchor Event Full PR Expansion Policy

- Objective & Hypothesis: keep full-PR auto expansion, but make it an Anchor Event-owned policy. Hypothesis: an event-level `fullPrExpansionPolicy` switch can preserve the existing expansion behavior for selected events while defaulting new and existing events to no automatic sibling PR creation.
- Input Type: Intent
- Active mode: Execute
- Durable owner: Anchor Event product policy plus PR full-status expansion boundary.

## Guardrails Touched

- PRD / Product TDD Anchor Event policy truth.
- Backend Anchor Event entity, migration, Admin management input/output, and `expandFullPR`.
- Frontend Admin Anchor Event editor copy and payload.
- Backend scenario proof for enabled and disabled expansion behavior.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/anchor-event/anchor-event-full-pr-expansion-policy.scenario.test.ts` passed.
- `pnpm lint:backend` passed.
- `pnpm db:lint` passed.
- `pnpm test:scenario:backend` passed.
- `git diff --check` passed.
