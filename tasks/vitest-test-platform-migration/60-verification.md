# Verification

## Commands

- `pnpm test:unit:backend` passed: 19 files, 68 tests.
- `pnpm test:unit:frontend` passed: 3 files, 4 tests.
- `pnpm test:scenario:backend` passed: 8 files, 30 tests.
- `pnpm test:scenario:system` passed: 7 files, 17 tests.
- `pnpm test:scenario:all` passed with sequential backend then system scenario
  execution.
- `pnpm test` passed: 22 unit files / 72 unit tests, then all 47 scenario
  tests.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend build` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm db:lint` passed.
- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `pnpm --filter @partner-up-dev/frontend test:unit` passed.
- `git diff --check` passed.

## Audits

- Active docs/code no longer reference the old `test:scenario backend`,
  `test:scenario system`, `test:backend:unit`, `run-scenario-tests`,
  `tsx --test`, or `node:test` test-platform entries.
- Scenario console output is now the Vitest `agent` summary during passing
  runs. Backend migration notices, HTTP request logs, and Vite informational
  logs are suppressed for scenario projects.
- Failure detail path is artifact-backed:
  - backend scenario records: `apps/backend/.result/scenario-records/`
  - system scenario records: `tests/scenario/.result/scenario-records/`
