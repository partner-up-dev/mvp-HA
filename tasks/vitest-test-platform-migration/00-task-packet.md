# Vitest Test Platform Migration

## Objective & Hypothesis

Migrate the repository test platform to Vitest as the primary runner and
reporting surface for frontend unit tests, backend unit tests, backend scenario
tests, and root-owned system scenario tests.

Hypothesis: Vitest can unify discovery, filtering, project scheduling, reporter
output, and CI artifacts while existing scenario infrastructure continues to own
runtime fixtures and business DSL.

## Input Classification

- Type: Constraint
- Reason: product behavior stays unchanged, but the repository test runner,
  reporting, and verification workflow change.
- Active mode: Explore -> Solidify before Execute.

## Working Files

- `05-source-notes.md`: official documentation and release evidence used by
  this packet.
- `10-decisions.md`: accepted migration decisions and remaining decision points.
- `15-baseline-inventory.md`: current test files, API usage, and CI references.
- `20-shift-left-spikes.md`: pre-implementation spike strategy.
- `30-vitest-lifecycle-spike.md`: project lifecycle risks and validation plan.
- `35-lifecycle-findings.md`: lifecycle spike results.
- `40-reporter-artifacts-spike.md`: reporter, scenario records, and artifact
  strategy.
- `45-reporter-artifacts-findings.md`: reporter/artifact spike results.
- `50-migration-slices.md`: execution slices and verification gates.
- `60-verification.md`: final command evidence and cutover audits.

## Guardrails Touched

- Root test commands in `package.json`.
- Backend and frontend package test commands.
- Backend and system scenario infrastructure.
- Unit tests under `apps/backend/src/**/*.test.ts` and
  `apps/frontend/src/**/*.test.ts`.
- Scenario tests under `apps/backend/tests/**/*.scenario.test.ts` and
  `tests/scenario/**/*.scenario.test.ts`.
- CI workflows and test documentation.

## Target Shape

```text
vitest.config.ts
  projects:
    backend-unit
    frontend-unit
    backend-scenario
    system-scenario
```

Vitest owns runner-level concerns. Scenario infra owns databases, migrations,
servers, Playwright browser helpers, domain builders, actions, probes, and
`ctx.record()` diagnostics.

## Status

- Task packet split into multiple files.
- User decisions recorded.
- Slice 1 baseline inventory completed.
- Slice 2 shift-left lifecycle and reporter/artifact spikes completed.
- Slices 1-7 completed locally.
- Root/package scripts, CI workflows, durable docs, unit tests, and scenario
  infrastructure are cut over to Vitest v4.
