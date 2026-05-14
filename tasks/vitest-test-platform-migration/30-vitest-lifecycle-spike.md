# Vitest Lifecycle Spike

## Risk

Backend and system scenario suites need one isolated runtime per project run:

- temporary Postgres database
- schema reset and migrations
- backend DB client cleanup
- system-only backend server
- system-only Vite frontend server
- system-only Playwright browser cleanup

The migration must avoid per-file database/server startup, accidental parallel
execution against shared state, and cleanup gaps after failed imports or failed
tests.

## Candidate Design

```text
backend-scenario project
  globalSetup:
    create scenario database
    install DATABASE_URL and scenario env flags
    reset schema and run migrations
    return teardown that closes DB clients and drops database

system-scenario project
  globalSetup:
    create scenario database
    install DATABASE_URL and scenario env flags
    allocate ports
    reset schema and run migrations
    start backend server
    start Vite frontend server
    install scenario environment
    return teardown that closes browser, servers, DB clients, and database

scenario helper
  scenario(name, run) -> vitest test(name, { concurrent: false }, ...)
```

## Questions To Prove

- Does project `globalSetup` run once per project when multiple projects are
  selected?
- Can setup state be shared safely with test files without relying on import
  order?
- Does returned teardown execute after collection failures and test failures?
- Which Vitest concurrency settings are required to make scenario projects
  serial by default?
- Does `process.env` mutation in project setup happen early enough for backend
  imports?
- Does Vitest module isolation change the current singleton assumptions for DB,
  backend app, browser, or scenario environment?

## Minimal Probe

- Create a temporary lifecycle probe with two scenario files in one project.
- Record setup count, teardown count, env visibility, and test execution order.
- Run with all projects selected and with only the scenario project selected.
- Delete the probe after findings are recorded.

## Stop Conditions

- Setup runs once per file instead of once per project.
- Teardown is skipped on failed collection/import.
- Scenario files can execute concurrently against shared runtime despite config.
- Backend imports happen before scenario env and database env are installed.
