# TypeScript 6 Migration

## Objective & Hypothesis

Migrate the workspace TypeScript toolchain from the current 5.x range to TypeScript 6.0.x while keeping runtime behavior unchanged.

Hypothesis: the migration is mostly a toolchain constraint update. The known repository-facing change is removal of deprecated `baseUrl` usage from frontend and backend tsconfig files.

## Guardrails Touched

- Root workspace dependency pinning in `package.json`.
- Frontend dependency pinning and SFC typechecking through `vue-tsc`.
- Backend dependency pinning and `tsc --noEmit` typechecking.
- Frontend and backend TypeScript module path resolution.

## Verification

- `pnpm install --lockfile-only` passed.
- `pnpm install` passed and installed `typescript 6.0.3`.
- `pnpm install --frozen-lockfile` passed.
- `pnpm exec tsc --version` reported `Version 6.0.3`.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/backend test:unit` passed: 66 tests.
- `pnpm db:lint` passed.
- `pnpm --filter @partner-up-dev/backend build` passed.
- `pnpm --filter @partner-up-dev/backend build:db-migrate-fc` passed.
- `pnpm test:scenario backend` passed: 28 tests.
- `pnpm test:scenario system` passed: 15 tests.

Notes:

- The prior UnoCSS 0.60.x / Vite 6.4.1 peer warning was resolved in `tasks/unocss-vite-peer-warning`.
- Backend and system scenario migrations emit existing PostgreSQL identifier truncation notices. The scenario suites passed.
