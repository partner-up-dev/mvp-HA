# PartnerRequest Scenario Verification

## Objective & Hypothesis

Objective: turn the current shared understanding about scenario-based verification into a concrete project task for PartnerUp, starting with `PartnerRequest` lifecycle risk.

Hypothesis: `PartnerRequest` risk is not concentrated in one isolated function. It comes from state-machine transitions and the modules that observe or depend on those states: participation, preflight, messages, notifications, booking support, booking execution, frontend action surfaces, and route-level continuity. A scenario system that can construct a valid starting state, trigger real backend behavior, and verify multiple observable signals should shorten bug-fix loops and reduce regression risk more effectively than relying only on database branches or low-level fixture rows.

This task is currently an Artifact + Explore/Solidify packet. It records planning truth and should not be treated as implemented testing infrastructure.

## Source Understanding

The external discussion "Mock vs Database Branch" contributes these claims:

- The useful target is not a fake database. The useful target is a scenario-based, state-oriented verification system.
- Scenario fixtures should describe business semantics rather than raw table rows.
- Builders should reuse or align with production domain rules so tests do not become a parallel product model.
- Real database execution remains important because Postgres constraints, transactions, SQL behavior, migrations, concurrency, query shape, and data quality cannot be fully covered by mocks.
- Database branches or prod-like cloned datasets are best used for migration validation, query validation, data-repair rehearsal, smoke tests, and performance or capacity checks.
- Production bugs should be reduced into minimal replayable scenarios, first failing before the fix and then retained as regression assets.
- AI-assisted coding benefits from machine-readable scenarios, structured failure output, a standard repair loop, and multi-signal assertions.

## PartnerUp Interpretation

`PartnerRequest` is the best first scenario surface because it is the durable collaboration object and already has explicit PRD/Product TDD anchors.

Current durable anchors:

- `docs/10-prd/behavior/rules-and-invariants.md`: visible PR status set, join semantics, participation lifecycle, message visibility, reliability, notification, and booking rules.
- `docs/10-prd/behavior/workflows.md`: creation, join, Anchor Event entry, messaging, reliability, and booking execution workflows.
- `docs/20-product-tdd/system-state-and-authority.md`: backend-authoritative state and frontend non-authoritative state.
- `docs/20-product-tdd/cross-unit-contracts.md`: PR lifecycle contract, route/API contract, preflight contract, messaging contract, notification contract, and coordination assumptions.
- `apps/backend/AGENTS.md`: Drizzle/Postgres workflow, domain use-case ownership, repositories as pure CRUD, and DB-backed job runner.

The project already has useful ingredients:

- backend domain/service unit tests under `apps/backend/src/**/*.test.ts`
- `pnpm db:reset`, which applies migrations and idempotent local seeds
- `apps/backend/seeds/` for local bootstrap data
- DB artifact validation in `.github/workflows/backend-db-validate.yml`
- Hono RPC type sharing between backend and frontend

The missing piece is a first-class scenario runner and scenario vocabulary that extends the existing backend test system rather than creating a separate platform.

## Methodology And Topology

What this task is designing:

- a lightweight method for keeping PRD, Product TDD, production domain code, and verification assets aligned
- a backend scenario integration layer that extends the current test system
- a domain test language for `PartnerRequest` lifecycle risks
- a rule-placement discipline that sends each invariant to the cheapest trustworthy enforcement layer

The method is not a new documentation bureaucracy. It is a living feedback loop:

```text
User Intent / Reality
  -> discussion and owner clarification
  -> PRD semantics
  -> Product TDD authority / contract mapping
  -> production domain types, schemas, and code
  -> unit tests for local rules
  -> scenario tests for cross-module runtime behavior
  -> smoke / prod-like checks for DB realism, migrations, performance, and external timing
  -> structured failures back to PRD / TDD / code / test language
```

Testing topology:

```text
Scenario Tests
  -> Domain Test Kit
       -> Core Test Infra
       -> production domain types / schemas / APIs
  -> real Postgres + migrations
  -> real backend behavior
```

Responsibility topology:

```text
builder   -> Given  -> creates valid starting state
action    -> When   -> triggers real behavior
probe     -> Actual -> reads observed facts
assertion -> Then   -> judges expected business promise
```

Enforcement topology:

```text
Types / schemas      -> static or boundary invariants
Unit tests           -> pure local rules
Scenario tests       -> persisted and cross-module behavior
Smoke / prod-like    -> migration, real data shape, concurrency, capacity, integration timing
```

Ownership topology:

```text
docs/10-prd/         -> product semantics and business vocabulary
docs/20-product-tdd/ -> authority, contracts, and cross-unit mapping
apps/backend/src/    -> production implementation and exported domain truth
apps/backend/tests/_infra/
                     -> business-agnostic test mechanics
apps/backend/tests/pr-core/_kit/
                     -> PR Core domain test language
apps/backend/tests/pr-core/*.scenario.test.ts
                     -> executable PR lifecycle scenarios
```

## Working Definition

A PartnerUp scenario is executable when it can be run by tooling and can answer whether a business claim still holds.

Minimum shape:

1. `given`: construct a valid business starting state, such as an `OPEN` PR with one active participant, a known time window, a user without conflicts, and relevant notification or booking facts.
2. `when`: trigger real behavior through HTTP API, using Hono app requests or a typed test client.
3. `then`: assert multiple observable signals, including persisted state, API response, domain events/outbox/jobs, problem-details codes, frontend-visible action availability, and selected UI-observable projection where appropriate.
4. `report`: on failure, emit structured details with scenario name, step, expected signals, actual signals, and diffs.

This is stricter than a prose acceptance criterion and broader than a single unit assertion.

## Candidate First Scenario Set

Start narrow with PR lifecycle and participation, then add adjacent modules.

1. `open_pr_join_reaches_ready`
   - Given an `OPEN` PR with `minPartners = 2` and one active creator.
   - When a second eligible user joins.
   - Then the PR becomes `READY`, active participant count is `2`, join preflight changes for the same viewer, and message access is available only to active participants.

2. `join_rejected_when_time_window_conflicts`
   - Given a user already joined a non-terminal PR whose time window conflicts with the target PR.
   - When the user tries to join another PR.
   - Then the write path rejects with the stable conflict problem code, persisted participant state is unchanged, and frontend preflight can surface the same guardrail.

3. `exited_participant_loses_message_visibility`
   - Given a current participant can view `/pr/:id/messages`.
   - When the participant exits or is released.
   - Then the message thread is no longer visible or actionable for that user, while current active participants retain access.

4. `pr_message_creates_one_unread_wave`
   - Given two active participants and remaining notification quota.
   - When one participant posts a message.
   - Then the thread records the message, unread-wave state changes for the other participant, and at most one `PR_MESSAGE` notification opportunity is scheduled for the unread wave.

5. `booking_execution_targets_current_active_participants`
   - Given a `READY` / `FULL` / `LOCKED_TO_START` PR admitted into booking execution.
   - When an operator submits a result.
   - Then the result is auditable and notifications target current active participants.

## Suggested Architecture Direction

- Keep scenario code near backend first, because backend owns authoritative state and write-path guardrails.
- Use real Postgres for scenario integration tests. Avoid replacing repositories with fake DB implementations for core lifecycle coverage.
- Trigger scenario behavior through backend HTTP APIs. Scenario tests should exercise controller validation, session/auth wiring, problem-details shape, API contracts, domain use cases, repositories, and persistence together.
- Put scenario tests outside source implementation code:
  - `apps/backend/tests/_infra/` owns business-agnostic test infrastructure.
  - `apps/backend/tests/<domain>/_kit/` owns domain test language.
  - `apps/backend/tests/<domain>/**/*.scenario.test.ts` owns executable scenarios.
- Keep the dependency direction explicit:
  - Scenario Tests -> Domain Test Kit -> Core Test Infra.
- Introduce business-level fixture builders before adding many scenarios, but keep them in the Domain Test Kit rather than core infra.
- Keep external boundaries controllable:
  - WeChat/OAuth/notification delivery can use contract-preserving fakes.
  - DB, migrations, constraints, transactions, controllers, domain use cases, repositories, outbox, and job scheduling should stay real where the scenario depends on them.
- Add structured scenario output so humans and coding agents can diagnose failures without reading raw logs first.
- Keep UI verification selective: assert route/API projections and only add browser-level checks for high-risk user-facing flows.

### Test Layer Model

Core Test Infra must remain business-agnostic. It should provide mechanics only:

- test database connection, reset, migration, and cleanup
- Hono request/test-client helpers
- transaction or suite isolation helpers
- fixed clock and deterministic ids when needed
- fake external boundary harnesses
- structured report and diff helpers
- low-level probes for generic observation surfaces

Domain Test Kit owns the business test language for a specific durable owner. For `pr-core`, that means names such as `PartnerRequest`, `OPEN`, `READY`, active participant, message visibility, preflight, and notification wave belong here rather than in `_infra`.

Scenario tests should read as business workflows and depend on domain-level words.

### Given / When / Actual / Then Responsibilities

The test vocabulary should be split by responsibility:

- `builder`: manufactures `Given`
- `action`: triggers `When` through HTTP API
- `probe`: reads `Actual`
- `assertion`: judges `Then`

Core infra can expose business-agnostic probes, such as:

- SQL row projection probe
- HTTP response probe
- outbox table probe
- job table probe
- operation-log table probe
- captured external request probe

Domain kits can wrap those into business probes, such as:

- `probePartnerRequestStatus`
- `probeActiveParticipants`
- `probeJoinPreflight`
- `probeMessageThreadVisibility`
- `probeUnreadWaveState`
- `probeBookingExecutionAudit`

Assertions should generally consume probes rather than re-reading facts directly. This keeps observation and judgment separate, and it makes failures easier to report.

### Living SOP: PRD To Verification

This system should be maintained as part of the existing product and engineering workflow. It is a small feedback loop, not a parallel governance process.

Proposed flow:

1. User intent enters the existing request-routing model as `Intent`, `Constraint`, `Reality`, or `Artifact`.
2. Discussion clarifies product semantics, durable owner, and blast radius.
3. PRD changes capture user-visible behavior, vocabulary, lifecycle, and rules.
4. Domain lifecycle / FSM / glossary updates only touch the affected durable owner.
5. Each rule is placed in the cheapest trustworthy enforcement layer:
   - production type / schema invariant
   - domain unit rule
   - scenario rule
   - smoke / prod-like validation
6. Code changes implement the accepted semantics.
7. Verification runs from fast to broad:
   - `tsc`
   - unit tests
   - scenario tests
   - smoke / prod-like checks when risk justifies them
8. Failure reports feed back into the right owner:
   - PRD when product semantics are incomplete or wrong
   - Product TDD when ownership, contract, or state authority is unclear
   - code when implementation diverges from accepted semantics
   - Domain Test Kit when test language lags production domain types

Keep this SOP lightweight. A rule earns extra documentation or scenario coverage by risk, recurrence, or cross-module blast radius.

Feedback is a normal path, not only a failure path. Boundary conditions, data-shape pressure, error semantics, performance tradeoffs, and interaction patterns often become visible during implementation. When implementation reveals friction or an unexpected but coherent behavior, feed it back into the smallest relevant owner:

- PRD for changed user-visible semantics
- Product TDD for authority, contract, or cross-unit boundary changes
- production code for implementation mismatch
- Domain Test Kit for stale or unclear test language
- scenario expectations only when the accepted business semantics changed or the old test was wrong

### Key Task Packet Questions

For future scenario-related task packets, answer these explicitly when the task is non-trivial:

1. Which business promise does this task change or protect?
2. Which behaviors are load-bearing and must remain stable?
3. Which behaviors are out of scope for this slice?
4. Which invariants are carried by production types or schemas?
5. Which invariants are carried by unit, scenario, or smoke/prod-like checks?
6. If verification fails, which boundary should be suspected first?
7. If tests are modified, is the change correcting an old test error or confirming new business semantics?

These questions extend the existing root task packet minimum (`Objective & Hypothesis`, `Guardrails Touched`, `Verification`) for this scenario-verification work.

### Invariant Placement Rules

Give the compiler and production schemas first claim on invariants they can represent.

Good candidates for production types, discriminated unions, Zod schemas, or branded/value types:

- finite status sets
- state-specific fields
- command payload shape
- visible API response shape
- stable problem-details codes
- bounds such as `minPartners >= 2`
- nullable vs present facts that differ by state

Good candidates for unit tests:

- pure status-transition functions
- bounds resolution
- visibility predicates
- schedule bucket calculations
- problem-details mapping

Good candidates for scenario tests:

- persisted state transitions
- rules that depend on multiple tables
- backend write-path guardrails
- API + repository + domain-use-case coordination
- outbox/job/notification side effects
- frontend-advisory preflight matching backend command rejection

Good candidates for smoke / prod-like checks:

- migrations
- query behavior over realistic data shapes
- data repair rehearsal
- concurrency paths
- performance or capacity risks
- external integration timing

State machines should project into production domain types where the states carry different legal facts, actions, or response shapes. The FSM should be visible in docs and executable in code.

Domain Test Kit should import production domain types and schemas wherever practical. It can provide builders, actions, probes, and assertions as test language, while business truth stays in PRD/Product TDD plus production domain code.

### AI Coding Guardrails

AI-assisted changes should follow a source-of-truth protocol so the test system does not drift with the implementation.

1. Bug fix:
   - first add or enable a failing scenario that reproduces the bug
   - then change production code
   - keep the scenario as a regression asset after it passes
2. Business semantic change:
   - first update PRD / Product TDD as needed
   - then update scenario expectations to match the accepted semantics
3. Implementation refactor:
   - keep scenario expectations stable
   - adapt only actions, builders, probes, or infra wiring when implementation shape changed but business semantics stayed stable
4. Test assertion change:
   - report `old expectation`
   - report `new expectation`
   - report `semantic reason`
   - report source: PRD / Product TDD / discovered behavior / bug report

### Comprehension Coverage

Scenario and integration tests should carry enough explanation to prove the author understands the protected business promise. This can be a short comment, metadata block, or linked task note. It should stay compact and focus on load-bearing questions.

For `open_pr_join_reaches_ready`, comprehension questions include:

1. Why should an `OPEN` PR reach `READY` after this join, instead of `FULL` or `ACTIVE`?
2. Is `READY` still joinable?
3. How do `minPartners` and `maxPartners` shape the resulting status?
4. What is the difference between an active participant and a historical participant?
5. Should duplicate join fail hard or remain idempotent, and why?
6. Should time-window conflict be rejected before or after the join mutation?
7. Does Community PR differ from Anchor PR in this chain?
8. Is this scenario verifying a product promise or an accidental implementation behavior?

### Domain Test Kit Discipline

Domain Test Kit should reduce low-level noise without hiding load-bearing business facts.

Guidelines:

- keep scenario inputs explicit for facts that change behavior, such as `minPartners`, `maxPartners`, active participant count, time window, and event context
- avoid builder defaults that silently decide important domain facts
- prefer small named builders over one large magic builder
- import production domain types and schemas where practical
- keep probes visible enough that scenario authors know which observation surface is being read
- keep assertions business-named but include actual observed values in failure output

### Smoke / Prod-Like Scope

Smoke and prod-like checks cover release and runtime realism risks that scenario tests should not fully own.

They are responsible for:

1. migrations being executable against a real Postgres instance
2. schema constraints taking effect in the real engine
3. typical production-like data shapes remaining readable and writable
4. concurrent joins respecting capacity and duplicate-participation constraints
5. query performance avoiding obvious regressions on representative data volume
6. async boundaries such as outbox, jobs, and notification opportunities being observable at least at smoke level

## Guardrails Touched

- Product truth:
  - `PartnerRequest` status semantics and join rules
  - participant lifecycle
  - PR message visibility and notification wave rules
  - booking support and booking execution rules
- Cross-unit truth:
  - backend-authoritative PR state
  - frontend advisory preflight and cache behavior
  - Hono RPC API contracts
  - problem-details error semantics
- Runtime truth:
  - Postgres/Drizzle migration model
  - idempotent local seeds
  - DB-backed job/outbox behavior

## Blast Radius Forecast

Likely future implementation surfaces:

- `apps/backend/package.json` and root `package.json` for scenario commands
- `apps/backend/tests/_infra/` for core test infrastructure
- `apps/backend/tests/pr-core/_kit/` for PR Core domain test language
- `apps/backend/tests/pr-core/**/*.scenario.test.ts` for scenario tests
- backend domain builders, actions, probes, and assertions for users, PRs, participants, messages, notification quota, jobs, and booking facts
- optional test database setup scripts
- CI workflow additions after the harness is stable
- later frontend smoke tests for selected route-level flows

No durable docs are changed in this packet. If the approach becomes accepted implementation policy, promotion candidates are:

- `docs/20-product-tdd/cross-unit-contracts.md` for scenario verification expectations tied to cross-unit contracts
- `docs/40-deployment/rollout.md` for CI/release validation layers
- backend local AGENTS or a test README for scenario-authoring rules

## Verification Plan

Current packet verification:

- Confirm a new task packet exists under `tasks/partnerrequest-scenario-verification/`.
- Confirm it records `Objective & Hypothesis`, `Guardrails Touched`, and `Verification`.
- Confirm it stays planning-only and makes no implementation or durable-doc claims.

Future implementation verification:

1. One scenario can be run locally against a reset test database.
2. The scenario fails with a structured report when an expected status, event, or guardrail is intentionally broken.
3. The scenario passes after the correct implementation is restored.
4. Running `pnpm db:lint` and existing backend tests remains clean.
5. CI can later run a small stable scenario suite without relying on production data.

## Open Questions

- Should the first runner be TypeScript-only inside backend, or should scenario definitions be data-first YAML/JSON with a TypeScript executor?
- Should scenarios call HTTP routes through Hono app bindings, or call use cases directly for the first slice?
- What is the local test DB isolation model: one database reset per suite, one schema per run, or transaction-per-scenario?
- Which problem-details codes should become mandatory assertions in the first lifecycle suite?
- Which frontend route projections deserve browser-level checks in the first iteration?

## Proposed First Slice

Build only one vertical scenario first:

`open_pr_join_reaches_ready`

Definition of done for that slice:

- uses real Postgres schema and migrations
- constructs users and a valid `OPEN` PR through a business-level builder
- triggers the real join behavior
- asserts PR status, participant count, action/preflight behavior, and message visibility projection
- emits structured failure output
- documents how to add the next scenario

## Implementation Phases

### Phase 0: Planning Commit

Goal: lock implementation boundaries before code changes.

Deliverables:

- task packet records HTTP-only scenario triggering
- task packet records `apps/backend/tests/_infra` and `apps/backend/tests/pr-core/_kit` topology
- first scenario scope remains `open_pr_join_reaches_ready`

### Phase 1: Test Runner And Database Harness

Goal: make scenario tests executable against real Postgres without domain test language.

Deliverables:

- backend scripts:
  - `test:unit`
  - `test:scenario`
- scenario database URL contract:
  - `SCENARIO_DATABASE_ADMIN_URL` for per-run temporary database creation
  - `TEST_DATABASE_URL` for focused debugging against a named database
- `apps/backend/tests/_infra/db/*`
  - connect to test DB
  - reset schema or database
  - run existing migrations
- `apps/backend/tests/_infra/scenario/*`
  - scenario wrapper
  - structured failure notes
- no PR Core business builders yet except what is necessary to validate the harness

Exit proof:

- an empty or trivial scenario test can connect to Postgres, migrate, and pass locally

### Phase 2: HTTP Test Client And Core Probes

Goal: make actions go through backend HTTP APIs and make observations reusable.

Deliverables:

- `apps/backend/tests/_infra/http/*`
  - construct Hono app test requests
  - support auth/session headers or cookies needed by backend routes
- `apps/backend/tests/_infra/probes/*`
  - SQL projection probe
  - HTTP response probe
  - outbox/job/operation-log probe as needed by the first scenario

Exit proof:

- a test can call a simple backend route through Hono HTTP and inspect response plus DB state

### Phase 3: PR Core Domain Test Kit

Goal: add PR Core test language while keeping business truth in production code.

Deliverables:

- `apps/backend/tests/pr-core/_kit/builders/*`
  - user builder
  - open PR builder
  - active participant builder
- `apps/backend/tests/pr-core/_kit/actions/*`
  - join action through HTTP API
  - preflight action through HTTP API if needed
- `apps/backend/tests/pr-core/_kit/probes/*`
  - PR status probe
  - active participant probe
  - join preflight probe
  - message visibility probe if needed
- `apps/backend/tests/pr-core/_kit/assertions/*`
  - PR status assertion
  - active participant count assertion
  - business-readable failure output

Exit proof:

- Domain Test Kit imports production domain types/schemas where practical
- key load-bearing scenario inputs remain explicit

### Phase 4: First Vertical Scenario

Goal: implement `open_pr_join_reaches_ready` as the first real scenario.

Deliverables:

- `apps/backend/tests/pr-core/partnerrequest-lifecycle.scenario.test.ts`
- scenario metadata or compact comments answering comprehension questions relevant to this slice
- assertions for:
  - status becomes `READY`
  - active participant count is `2`
  - duplicate join by the same viewer does not duplicate active participation
  - preflight or command rejection remains aligned for at least one load-bearing guardrail
  - message visibility projection is checked if the required API route and setup are stable enough

Exit proof:

- scenario fails clearly if expected status or participant facts are broken
- scenario passes against migrated local Postgres

Status: implemented locally.

Implementation notes:

- Added backend scripts:
  - `test:unit`
  - `test:scenario`
- Added root pass-through scripts:
  - `test:backend:unit`
  - `test:backend:scenario`
- Added `apps/backend/tests/run-scenario-tests.ts`.
- Added Core Test Infra under `apps/backend/tests/_infra/`.
- Added PR Core Domain Test Kit under `apps/backend/tests/pr-core/_kit/`.
- Added first scenario at `apps/backend/tests/pr-core/partnerrequest-lifecycle.scenario.test.ts`.
- Added a short authoring guide at `apps/backend/tests/README.md`.
- Exported backend `app` for Hono in-process HTTP requests and guarded `serve()` behind direct module execution.
- Scenario runner sets `DATABASE_URL` from a temporary database created through `SCENARIO_DATABASE_ADMIN_URL`, disables request-tail/bootstrap side effects for scenario execution, runs migrations, imports `*.scenario.test.ts`, closes backend DB clients after `node:test` finishes, then drops the temporary database.
- Scenario runner still accepts `TEST_DATABASE_URL` for focused debugging against a named database; that path resets schema and keeps the database.

Verified locally with:

- `pnpm --filter @partner-up-dev/backend test:unit`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `SCENARIO_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5436/postgres pnpm --filter @partner-up-dev/backend test:scenario`
- queried local Postgres after the scenario run and confirmed no `partnerup_scenario_*` temporary databases remained

Behavior discovered during implementation:

- Duplicate join by the same active participant is currently idempotent: it returns the current public PR and does not create a second active participant row. The first scenario therefore verifies "duplicate join does not duplicate participation" instead of expecting a hard failure.
- There is currently no backend preflight route in code, so the first scenario verifies command behavior and message visibility. Preflight alignment remains a future slice once the route exists.
- Initial local verification used an already-running Docker Postgres container (`mvp-ha-postgres-1`, mapped to localhost port `5436`) and a manually created `partnerup_scenario` database.
- The runner now supports an admin/base Postgres URL and creates a unique temporary database per scenario run, then drops it after `node:test` finishes.
- `TEST_DATABASE_URL` remains available for focused debugging against a named database. In that mode the runner resets schema and leaves the database in place.

### Local Scenario Database Lifecycle Target

Preferred local lifecycle:

1. Developer provides an admin/base Postgres URL, such as `SCENARIO_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5436/postgres`.
2. Runner creates a unique temporary database name, such as `partnerup_scenario_<timestamp>_<pid>`.
3. Runner sets `DATABASE_URL` to that temporary database.
4. Runner runs migrations and scenario tests.
5. Runner closes application DB clients.
6. Runner drops the temporary database after `node:test` completes.

Fallback lifecycle:

- If `TEST_DATABASE_URL` is explicitly provided, keep the current behavior: reset schema inside that database and do not drop the database.

Reasoning:

- explicit `TEST_DATABASE_URL` is useful for CI service containers and debugging
- admin URL + ephemeral DB is safer for local runs because each run gets isolation and cleanup
- dropping a whole temporary database avoids stale schema or leftover rows when a failed run interrupts after migration

Status: implemented locally in `apps/backend/tests/run-scenario-tests.ts` and `apps/backend/tests/_infra/db/test-database.ts`.

### Phase 5: CI Integration

Goal: run the first scenario in GitHub Actions without relying on production data.

Design notes from CI feedback-loop risk:

- Source note: https://xlii.space/eng/i-hate-github-actions-with-passion/
- Keep GitHub Actions YAML as a thin runner.
- Put scenario execution logic in repository-owned scripts and package commands.
- The CI command should match the local command as closely as possible.
- Prefer one Linux/Postgres path for this slice before adding matrix complexity.
- Use a Postgres service container only as infrastructure; database creation, migration, scenario import, and cleanup stay inside `test:scenario`.
- Add clear job names and command boundaries so failures point to install, typecheck, unit, db lint, scenario migration, or scenario execution.
- Avoid embedding shell-heavy business logic in the workflow file.
- If CI fails while local passes, first suspect runner/service wiring, environment variables, or dependency installation rather than PartnerRequest semantics.

Deliverables:

- GitHub Actions job with Postgres service container
- `SCENARIO_DATABASE_ADMIN_URL` wired to the service container admin database
- `test:scenario` runs after install and migrations

Exit proof:

- CI can run the single scenario suite deterministically

Status: workflow added at `.github/workflows/backend-scenario-tests.yml`.

Workflow shape:

- trigger on backend-related pull requests and manual dispatch
- start `postgres:17-alpine` as a job service
- install workspace dependencies with existing pnpm setup pattern
- run backend typecheck
- run backend unit tests
- run DB artifact lint
- run backend scenario tests through the repository script

Local proof for commands used by the workflow:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm test:backend:unit`
- `pnpm db:lint`
- `SCENARIO_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5436/postgres pnpm test:backend:scenario`

Remaining proof:

- observe the first GitHub Actions run after push/PR

### Phase 6: Expand By Risk

Goal: grow coverage only where risk justifies it.

Candidate next scenarios:

- `join_rejected_when_time_window_conflicts`
- `exited_participant_loses_message_visibility`
- `pr_message_creates_one_unread_wave`
- `booking_execution_targets_current_active_participants`

Expansion rule:

- add scenarios for production bugs, recurrent risk, cross-module blast radius, or semantics that cannot be carried by types/unit tests
- avoid turning the system into broad E2E replacement or documentation ceremony
