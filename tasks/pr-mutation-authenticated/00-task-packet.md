# PR Mutation Authenticated Requirement

## Objective & Hypothesis

All public PR write commands should require an authenticated user before mutating PR-owned state or PR-adjacent participation state.

Hypothesis: the smallest durable fix is to centralize the authenticated user guard in `pr-controller.shared.ts`, then use that guard at every `/api/pr` mutation entry before calling existing domain use cases.

## Guardrails Touched

- Backend PR controller protocol boundary.
- PR participant commands: join, waitlist, waitlist cancel, exit, join-gate resolve.
- PR-adjacent mutation commands: messages, read markers, booking contact phone, reimbursement-related write-free status remains read-only.
- Feedback questionnaire submission now uses the same authenticated respondent requirement.
- Existing domain use cases keep their business rules unchanged.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm lint:backend`
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-draft.scenario.test.ts`
- `pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-create.scenario.test.ts`
- Source scan for `/api/pr` mutation routes still using session-only identity.
