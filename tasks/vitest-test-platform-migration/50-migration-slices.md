# Migration Slices

## Slice 1: Baseline Inventory

- Count and classify current unit and scenario tests by package and runtime
  needs.
- Identify all `node:test` API usage patterns: `test`, `describe`, `it`,
  hooks, skip/todo, concurrency, and assertion style.
- Identify CI workflows and docs that reference current commands.

Verification:

- Inventory notes added to this task directory.
- No code mutation.

## Slice 2: Shift-Left Spikes

- Run lifecycle spike.
- Run reporter/artifact spike.
- Record findings and final decisions.

Verification:

- Spike notes added:
  - `35-lifecycle-findings.md`
  - `45-reporter-artifacts-findings.md`
- User confirmation before broad migration if findings change the target
  architecture.

## Slice 3: Vitest Project Skeleton

- Add Vitest v4 dependency and root config with projects.
- Configure `.result` output paths per suite/package.
- Prove one low-risk backend unit test and one low-risk frontend unit test run
  through Vitest.

Verification:

- Focused backend unit via Vitest passes.
- Focused frontend unit via Vitest passes.

## Slice 4: Unit Test Migration

- Migrate backend and frontend unit tests from `node:test` to Vitest APIs.
- Preserve test names and assertion intent.
- Avoid broad refactors inside production code.

Verification:

- Backend unit project passes.
- Frontend unit project passes.
- Relevant package typechecks pass.

## Slice 5: Backend Scenario Native Vitest

- Change backend `scenario()` helper to use Vitest `test`.
- Move database setup and cleanup into Vitest project lifecycle.
- Keep scenario context behavior with artifact-backed detailed context.

Verification:

- Backend scenario project passes.
- Failure-output drill proves individual scenario reporting.

## Slice 6: System Scenario Native Vitest

- Change system `scenario()` helper to use Vitest `test`.
- Move Postgres, backend server, Vite server, and Playwright cleanup into
  Vitest lifecycle.
- Keep system scenario execution serial and deterministic.

Verification:

- System scenario project passes.
- Failure-output drill proves individual scenario reporting and artifact
  capture.

## Slice 7: Command, CI, And Docs Cutover

- Switch root and package scripts to Vitest-backed commands.
- Update CI workflow invocations.
- Update scenario READMEs and root development workflow docs.

Verification:

- Root unit command passes.
- Backend scenario command passes.
- System scenario command passes.
- CI command references audited.
- `git diff --check`.

## Completion Notes Through Slice 7

- Slices 1-2 completed with inventory, lifecycle spike, and reporter/artifact
  spike recorded in this task packet.
- Slices 3-4 completed by adding root Vitest v4 projects and migrating backend
  and frontend unit tests to Vitest APIs.
- Slices 5-6 completed by moving backend and system scenario suites onto native
  Vitest scheduling with project lifecycle setup and compact terminal output.
- Slice 7 completed by cutting over root scripts, package scripts, CI workflow
  commands, and durable docs to the Vitest-backed shape.
- Scenario aggregation is intentionally sequential through package scripts so
  backend-scenario and system-scenario project setup cannot race over shared
  process-level environment.
