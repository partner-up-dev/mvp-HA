# PR Temporal Close And Expire Rules

## Objective & Hypothesis

Change PR temporal finalization so close-time refresh distinguishes unsuccessful and successful collaborations by active participant count.

Hypothesis: `refreshTemporalStatus` already owns enough lifecycle authority to make this change locally, with PRD semantics and backend scenario coverage as the durable guardrails.

## Guardrails Touched

- Product lifecycle semantics in `docs/10-prd/behavior/rules-and-invariants.md`.
- Backend PR lifecycle state machine in `apps/backend/src/domains/pr-core/temporal-refresh.ts`.
- Backend scenario verification for persisted temporal status refresh.

## Verification

- Added scenario coverage for:
  - close time reached, `ACTIVE`, active participants `>= minPartners` -> `CLOSED`
  - close time reached, active participants `< minPartners` -> `EXPIRED`
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-temporal-finalization.scenario.test.ts`
- `pnpm lint:backend`
- `pnpm --filter @partner-up-dev/backend typecheck`
