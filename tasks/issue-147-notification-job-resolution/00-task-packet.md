# Task Packet - Issue 147 Notification Job Resolution Semantics

## MVT Core

- Objective & Hypothesis: Clarify and implement bucket-based scheduling semantics for notification jobs by making `resolution_ms` a first-class persisted job attribute and expressing early/late tolerance in resolution units rather than milliseconds. Hypothesis: a symmetric bucket model in JobRunner will simplify due/missed logic, remove the need for handler-time timing guards, and let notification types declare timing policy consistently.
- Guardrails Touched:
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/unit-topology.md`
  - `docs/40-deployment/observability.md`
  - backend authority boundary for job scheduling semantics (`infra/jobs` owns execution semantics; notification modules only supply policy)
  - forward-only DB migration discipline for `jobs` table changes
- Verification:
  - apply the forward-only schema migration for `jobs`
  - backend typecheck and build pass
  - add targeted tests for bucket-based due/missed behavior, including finite and infinite late tolerance
  - verify notification scheduling call sites still map to the expected persisted job fields
  - inspect persisted `jobs` rows and confirm `run_at / resolution_ms / early_tolerance_units / late_tolerance_units` are explicit

## Solidify Notes

- Input Type: Constraint
- Active Mode: Execute
- Durable Owner:
  - backend infra cluster for scheduling semantics and persistence
  - promote durable doc changes only where the ownership or operational contract truly changed after verification
- Address and Object:
  - `apps/backend/src/entities/job.ts`
  - `apps/backend/drizzle/*` next schema migration
  - `apps/backend/src/infra/jobs/job-runner.ts`
  - `apps/backend/src/infra/notifications/*`
  - `tasks/issue-147-notification-job-resolution/00-task-packet.md`
- State Diff:
  - From: jobs persist `run_at` plus millisecond-based early/late tolerance; `resolution` is absent from persisted state; notification jobs lean on per-call tolerance values and the infinite-late sentinel.
  - To: jobs persist `run_at`, `resolution_ms`, `early_tolerance_units`, and `late_tolerance_units`; JobRunner evaluates due/missed status via symmetric bucket logic; notification jobs provide per-type policies in job units; no handler-time timing guard is added for freshness.
- Blast Radius Forecast:
  - `jobs` schema and migration artifacts
  - JobRunner claim SQL and MISSED marking logic
  - every `scheduleOnce()` caller that relies on defaults or explicit tolerance semantics
  - notification policy wiring for `REMINDER_CONFIRMATION`, `ACTIVITY_START_REMINDER`, `BOOKING_RESULT`, `NEW_PARTNER`, and `PR_MESSAGE`
- Invariants Check:
  - dedupe, lease, retry, and active-job uniqueness semantics remain unchanged
  - infinite late tolerance remains supported
  - request-tail and external-trigger execution model remain unchanged
  - user-facing API contracts stay unchanged
- Scope Decision:
  - include JobRunner persistence and claim semantics
  - include notification scheduling policy mapping
  - keep the change backend-internal; no frontend/API contract expansion
  - do not add handler-time timing guards
  - do not redesign cron cadence or maintenance trigger topology
- Resolved Design Decisions:
  - `resolution_ms` is persisted in the `jobs` table
  - early/late tolerance are expressed in resolution units, not milliseconds
  - early/late are treated symmetrically in JobRunner bucket logic
  - the issue description is the current decision record until verified code and durable docs are updated

## Execution Readiness

- Executed:
  - added transitional `jobs` columns for `resolution_ms`, `early_tolerance_units`, and `late_tolerance_units`
  - updated JobRunner to persist bucket fields and evaluate due/missed status with symmetric bucket logic
  - moved timing helpers into a dedicated module and added targeted node tests
  - wired notification scheduling through explicit per-type job policies
  - documented the backend/runtime ownership change in Product TDD and deployment observability docs
- Verification Results:
  - `pnpm --filter @partner-up-dev/backend typecheck` passed
  - `pnpm --filter @partner-up-dev/backend build` passed
  - `pnpm --filter @partner-up-dev/backend db:lint` passed
  - `pnpm --filter @partner-up-dev/backend db:generate` passed after rebasing `drizzle/meta/0000_snapshot.json` to the current entity baseline
  - `node --test --import tsx src/infra/jobs/job-runner.test.ts` passed in `apps/backend`
- Residual Risk:
  - `apps/backend/drizzle/meta/_journal.json` still reflects legacy repo history shape, but it is no longer blocking non-interactive `db:generate` for the current schema baseline.
