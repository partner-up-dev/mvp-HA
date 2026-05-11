# System Scenario Foundation

## Objective & Hypothesis

Build root-owned system scenario infrastructure that can verify frontend-started
user journeys through the real frontend dev server, real backend HTTP server,
and an isolated Postgres database.

Hypothesis: system scenarios belong under `tests/scenario/` because the runner
coordinates both app units and runtime infrastructure. The first slice proves
the path with the PR detail join workflow. The next slice extends PR detail
coverage to booking contact Join gate, participant confirmation, and waitlist
promotion.

## Guardrails Touched

- Root scenario workflow in `scripts/run-scenario-tests.mjs`.
- Root test infrastructure under `tests/scenario/_infra/`.
- Backend scenario database lifecycle reused from `apps/backend/tests/_infra/db/test-database.ts`.
- Backend PR Core scenario builders reused for `Given` setup.
- Frontend session storage contract used by browser setup.
- Frontend PR detail scenario nodes exposed through `data-testid`.

## Verification

- `pnpm test:scenario system`
- `pnpm build:backend`
- `pnpm build:frontend`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `git diff --check`
- Minimal scenario: `pr_detail_join_flow_reaches_confirm_action`
- Added scenarios:
  - `pr_detail_join_with_booking_contact_gate_reaches_participant_state`
  - `pr_detail_participant_confirms_slot`
  - `pr_detail_waitlist_promotes_after_active_participant_exit`
- PR detail scenario uses `data-testid` semantic nodes for browser actions and
  post-flow assertions.

## Notes

- The first demo asserts user-visible post-join UI state.
- Booking contact Join gate uses a backend probe because the important side
  effect is hidden persistence: the phone record must be owned by the joined
  partner slot after the frontend flow completes.
