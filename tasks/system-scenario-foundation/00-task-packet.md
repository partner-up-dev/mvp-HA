# System Scenario Foundation

## Objective & Hypothesis

Build root-owned system scenario infrastructure that can verify frontend-started
user journeys through the real frontend dev server, real backend HTTP server,
and an isolated Postgres database.

Hypothesis: system scenarios belong under `tests/scenario/` because the runner
coordinates both app units and runtime infrastructure. The first slice proves
the path with the PR detail join workflow.

## Guardrails Touched

- Root scenario workflow in `scripts/run-scenario-tests.mjs`.
- Root test infrastructure under `tests/scenario/_infra/`.
- Backend scenario database lifecycle reused from `apps/backend/tests/_infra/db/test-database.ts`.
- Backend PR Core scenario builders reused for `Given` setup.
- Frontend session storage contract used by browser setup.
- Frontend PR detail scenario nodes exposed through `data-testid`.

## Verification

- `pnpm test:scenario system`
- Minimal scenario: `pr_detail_join_flow_reaches_confirm_action`
- PR detail scenario uses `data-testid` semantic nodes for browser actions and the post-join assertion.

## Notes

- The first demo asserts user-visible post-join UI state.
- Backend probes remain available for future scenarios that need persistence or
  hidden side-effect proof.
