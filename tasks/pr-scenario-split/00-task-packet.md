# PR Scenario Split

## Objective & Hypothesis

Split the oversized backend PR lifecycle scenario test into focused `pr-*.scenario.test.ts` files while preserving the existing HTTP scenario coverage and observable assertions.

Hypothesis: extracting shared scenario language into `tests/pr-core/_kit` will make each scenario file smaller and easier to scan without changing product behavior.

## Guardrails Touched

- Backend scenario test layout under `apps/backend/tests/pr-core`.
- PR Core domain test kit under `apps/backend/tests/pr-core/_kit`.
- Existing PR lifecycle scenario assertions for drafts, joins, waitlist, join gates, and admin deletion.

## Verification

- `pnpm test:scenario`: pass, 12 scenario tests.
- `pnpm --filter @partner-up-dev/backend typecheck`: pass.
