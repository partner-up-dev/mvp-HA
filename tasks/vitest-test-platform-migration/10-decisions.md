# Decisions

## Accepted

- Adopt Vitest v4 directly. GitHub release evidence: `v4.0.0` was released on
  2025-10-22, more than six months before 2026-05-14.
- Use native Vitest project scheduling. Avoid a single wrapper test that hides
  individual scenario names and failures.
- Do not preserve old test command compatibility as a goal. Cut over commands
  to the Vitest-backed shape during the final slice.
- Write detailed outputs under each package or suite `.result` directory.
  Candidate paths:
  - `apps/backend/.result/`
  - `apps/frontend/.result/`
  - `tests/scenario/.result/`
- Keep frontend unit tests in `node` environment for the first migration.
  Do not introduce `happy-dom` or `jsdom` in this task.
- Execute migration in slices within one larger task. Pause for confirmation at
  high-risk points such as dependency/version selection, lifecycle ownership,
  CI command cutover, and unexpected behavior-contract conflicts.
- Keep Playwright as the browser automation engine for system scenarios.
- Put scenario database setup, migrations, backend server startup, and Vite
  server startup in Vitest project `globalSetup`.
- Pass serializable runtime values such as backend/frontend base URLs through
  `project.provide()` and `inject()`, or through environment variables installed
  before app imports.
- Configure scenario projects as serial by default with `fileParallelism: false`,
  `maxWorkers: 1`, and `isolate: false`.
- Clean up worker-owned objects, especially Playwright browser singletons, from
  worker-side lifecycle such as `setupFiles` + `afterAll`.
- Use Vitest built-in `agent` reporter as the default terminal reporter.
- Persist full scenario records to `.result` artifacts and show only compact
  context plus artifact path in terminal failures.
- Use the built-in `agent` reporter for cutover CI. Add JSON/JUnit reporter
  outputs through root/CI CLI flags when a downstream consumer is introduced.
- Keep database client teardown in Vitest project teardown for scenario DB
  owners. Worker-side setup files should clean up only worker-owned objects such
  as Playwright browser singletons.

## Remaining Decision Points

- Whether scenario record artifacts should be shared with a small custom
  reporter later. The cutover implementation writes records in the `scenario()`
  helper.

## Non-Goals

- Product behavior changes.
- Rewriting scenario builders, actions, or probes for style alone.
- Replacing Playwright browser automation with Vitest browser mode.
- Adding component test coverage as part of this runner migration.
- Hiding all detail from failures; the goal is short terminal output with
  discoverable artifacts.
