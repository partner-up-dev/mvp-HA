# Backend Scenario Tests

This folder extends the existing backend `node:test` setup with scenario integration tests.

## Layout

```text
tests/
├── _infra/                 # business-agnostic test mechanics
└── pr-core/
    ├── _kit/               # PR Core domain test language
    └── *.scenario.test.ts  # executable PR Core scenarios
```

Dependency direction:

```text
Scenario Tests -> Domain Test Kit -> Core Test Infra
```

## Run

```bash
SCENARIO_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5436/postgres pnpm test:scenario
```

The runner creates a unique temporary database from `SCENARIO_DATABASE_ADMIN_URL`, maps it to `DATABASE_URL`, runs migrations, imports `*.scenario.test.ts`, closes backend DB clients after the test run, then drops the temporary database.

For focused debugging, `TEST_DATABASE_URL` can point at a named database. In that mode the runner resets the schema inside that database and leaves the database itself in place.

## Authoring Rule

- Use builders for `Given`.
- Use HTTP actions for `When`.
- Use probes for `Actual`.
- Use assertions for `Then`.
- Keep load-bearing business facts explicit in scenario files.
- Import production domain types and schemas where practical.
- Update scenario expectations only when PRD/Product TDD semantics changed or an old test expectation was wrong.
