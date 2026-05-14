# Lifecycle Spike Findings

## Probe Summary

Temporary Vitest v4.1.6 probe files were created under this task directory and
removed after the spike.

The probe used:

- one `lifecycle` project
- project `globalSetup`
- project `setupFiles`
- two passing test files
- one intentional failing test file
- `project.provide()` plus `inject()`
- `fileParallelism: false`, `maxWorkers: 1`, and `sequence.concurrent: false`
- a second run with `isolate: false`

## Findings

- `globalSetup` ran once for the selected project.
- The returned teardown function ran after all files finished.
- Teardown also ran after an intentional test failure.
- `process.env` mutations made in `globalSetup` were visible in test workers.
- `project.provide()` and `inject()` worked for serializable setup data.
- `setupFiles` ran once per test file.
- With `fileParallelism: false` and `maxWorkers: 1`, Vitest still used separate
  worker processes for different test files.
- Adding `isolate: false` made multiple files run in the same worker process in
  the probe.

## Design Consequences

- Scenario database setup, migrations, backend server startup, and Vite server
  startup should live in project `globalSetup` because those resources can be
  owned by the setup process and closed by returned teardown.
- Values needed by test files, such as backend/frontend base URLs, should be
  passed through `project.provide()` and read with `inject()`, or installed into
  `process.env` before imports that need them.
- Playwright browser object ownership needs care. A browser singleton created in
  a worker process should be cleaned up from worker-side lifecycle, such as
  `setupFiles` with `afterAll`, because project teardown runs in a different
  global scope.
- Scenario projects should set `fileParallelism: false`, `maxWorkers: 1`, and
  `isolate: false` unless a future fixture model proves safe parallelism.
- Real backend scenario migration confirmed that closing backend DB clients from
  a per-file setup hook is unsafe because `setupFiles` run once per test file.
  Database client close belongs to project teardown after all scenario files
  finish.

## Remaining Implementation Checks

- Keep a failure drill in the real scenario migration slice to prove teardown
  remains reliable after production imports.
