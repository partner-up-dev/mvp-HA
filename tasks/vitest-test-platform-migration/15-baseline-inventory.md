# Baseline Inventory

## Test File Counts

- Backend unit: 19 files under `apps/backend/src/**/*.test.ts`.
- Frontend unit: 3 files under `apps/frontend/src/**/*.test.ts`.
- Backend scenario: 8 files under `apps/backend/tests/**/*.scenario.test.ts`.
- System scenario: 7 files under `tests/scenario/**/*.scenario.test.ts`.

## Current Runner Shape

- Root scenario entry: `package.json` -> `node scripts/run-scenario-tests.mjs`.
- Backend unit entry: `apps/backend/package.json` -> `tsx --test "src/**/*.test.ts"`.
- Frontend unit entry: `apps/frontend/package.json` -> `tsx --test "src/**/*.test.ts"`.
- Backend scenario entry: `apps/backend/package.json` ->
  `tsx tests/run-scenario-tests.ts`.
- System scenario entry: `package.json` ->
  `tsx tests/scenario/run-scenario-tests.mts`.

## Current API Usage

- Unit tests import `node:test` directly.
- Scenario tests call local `scenario()` helpers, and those helpers import
  `node:test`.
- Scenario runners import `after` from `node:test` for cleanup registration.
- Assertion style is almost entirely `node:assert/strict`.
- Some backend unit tests use `describe`/`it` from `node:test`; most use
  default `test`.
- No `.only`, `.skip`, or `.todo` usage was found in the scanned test files.

## CI References

- `.github/workflows/backend-gate.yml`
  - `pnpm test:backend:unit`
  - `pnpm test:scenario backend`
- `.github/workflows/e2e-gate.yml`
  - `pnpm exec playwright install --with-deps chromium`
  - `pnpm test:scenario system`
- `.github/workflows/backend-db-validate.yml`
  - DB validation only; no unit/scenario runner migration needed except package
    install side effects.

## Migration Implications

- Unit migration is mostly import-level and assertion-compatible. Vitest can keep
  `node:assert/strict` during the first pass, then `expect` migration can be
  selective.
- Scenario migration should start at the two `scenario()` helpers so individual
  scenario names remain first-class tests.
- Existing scenario runners should disappear or become obsolete during command
  cutover because command compatibility is not a goal.
- CI command updates are concentrated in backend gate and E2E gate.
