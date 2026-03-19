# PLAN - Fix Frontend Architectural Mismatch in `apps/frontend`

## 1. Problem Statement

The frontend currently mixes multiple classification axes at the same directory level:

- business/domain meaning
- technical responsibility
- UI composition depth
- data-access concerns
- workflow/use-case concerns

This causes semantic overlap among `features`, `components`, `widgets`, `queries`, and `entities`. As a result:

- the same concept appears in several folders with different meanings
- boundaries are inferred from habit instead of defined by architecture
- shared code becomes a dumping ground
- folder names stop predicting what a module is allowed to do
- design-system governance will continue to rot because architectural ownership is already blurred

Concrete symptoms already visible in the codebase:

- `components/common/SubmitButton.vue` is not a generic primitive; it is a specific button usage packaged as a common component
- page files assemble business logic, data fetching, display formatting, and local UI patterns directly
- `entities`, `queries`, and `features` are coupled by imports, but their ownership semantics are not explicit
- `widgets` sometimes act as page sections, sometimes view composition, and sometimes business-oriented presentation modules
- some `components/*` depend on query result types, which makes view primitives depend on data-access packaging choices

## 2. First-Principles Diagnosis

Architecture becomes unstable when one folder tree tries to encode several different dimensions at once.

In a frontend like this, the important dimensions are:

### Axis A: Domain Ownership

What business area does the code belong to?

Examples:

- `pr`
- `event`
- `share`
- `admin`
- `auth`

### Axis B: Technical Responsibility

What kind of thing is the module?

Examples:

- model / schema / type
- query / command / gateway
- use case / orchestrator
- presentation component
- route/page
- formatting / mapping / adapter

### Axis C: UI Composition Depth

How close is the module to raw UI primitives vs route-specific assembly?

Examples:

- primitive UI
- composite UI
- section/screen composition
- page/route shell

The current structure treats several of these axes as peers, which guarantees overlap.

## 3. Architectural Goal

Restore orthogonality by making the directory system answer one primary question at each level.

Recommended principle:

- top level should primarily answer domain ownership
- inside each domain, subfolders should answer technical responsibility
- UI composition depth should be explicit inside the UI subtree, not as a competing top-level taxonomy

This lets module boundaries become predictable again.

## 4. Target Structure

Adopt a domain-first structure with a small number of global/shared buckets.

Suggested top-level shape:

- `src/app/*`
- `src/shared/*`
- `src/domains/*`
- `src/processes/*`
- `src/pages/*`

### `src/app/*`

Purpose: application wiring only.

Examples:

- router registration
- app bootstrapping
- providers
- top-level app config

### `src/shared/*`

Purpose: cross-domain code with no single business owner.

Allowed contents:

- low-level UI primitives
- platform/browser utilities
- generic styling infrastructure
- analytics transport
- generic URL utilities
- generic storage utilities

Not allowed:

- PR-specific or Event-specific semantics
- use-case orchestration for a domain workflow

### `src/domains/*`

Purpose: business-owned modules grouped by domain.

Examples:

- `src/domains/pr/*`
- `src/domains/event/*`
- `src/domains/share/*`
- `src/domains/admin/*`
- `src/domains/auth/*`

Within a domain, subfolders should encode technical responsibility.

Example shape:

- `model/`
- `api/`
- `queries/`
- `commands/`
- `use-cases/`
- `ui/primitives/`
- `ui/composites/`
- `ui/sections/`
- `adapters/`

### `src/processes/*`

Purpose: app-level workflows that cross domains or platform boundaries.

Examples:

- OAuth/login bootstrap
- background synchronization
- environment/session bootstrapping

### `src/pages/*`

Purpose: route entrypoints only.

Rules:

- a page composes domain UI and app/shared infrastructure
- a page should not become the owner of reusable business logic or reusable screen sections

## 5. Directory Semantics

The new structure only works if each category has a strict meaning.

### Shared UI Primitive

Definition:

- a low-level, reusable UI building block with stable API

Examples:

- `Button`
- `IconButton`
- `Modal`
- `PageHeader` only if it is truly generic

Rules:

- no domain-specific data fetching
- no domain-specific copy or workflow assumptions
- no dependence on query result types

### Domain UI Primitive / Composite / Section

Definition:

- UI owned by one business domain

Examples in `pr` domain:

- status badge
- facts card
- actions bar
- share section if it is PR-specific

Rules:

- allowed to depend on domain model/view-model types
- not allowed to perform routing-shell responsibilities unless intentionally a page section

### Query / Command

Definition:

- data-access wrapper around backend/API interaction

Rules:

- owns cache, invalidation, transport, fetch/mutate lifecycle
- does not own presentation formatting
- returns domain-oriented data types or adapters, not arbitrary transport leakage where avoidable

### Use Case

Definition:

- orchestrates a user workflow or business interaction

Examples:

- join/exit PR
- create PR flow
- share workflow

Rules:

- may depend on queries/commands, routing, analytics, auth gates
- should not be hidden inside page files when reused

### Model / Adapter

Definition:

- domain types, mappers, selectors, formatters, and normalization rules

Rules:

- owns meaning transformation
- should not depend on UI components
- should not depend on Vue SFCs

## 6. Boundary Rules

### Import Direction

Target dependency direction:

1. `app/pages/processes`
2. `domains`
3. `shared`

Within a domain:

1. `ui/sections` may depend on `ui/composites`, `use-cases`, `queries`, `model`
2. `ui/composites` may depend on `ui/primitives`, `model`
3. `ui/primitives` may depend on `model` only when truly domain-owned
4. `use-cases` may depend on `queries`, `commands`, `model`, `shared`
5. `queries/commands` may depend on transport/shared infrastructure
6. `model` should depend only on domain model utilities and generic shared helpers

Forbidden directions:

- shared -> domain
- primitive UI -> query
- model -> SFC/component
- query -> page/widget/component

### Ownership Rule

If a module name includes domain language, it should not live in `shared/common`.

Examples:

- `SubmitButton` should not be the shared primitive; `Button` should be
- `PRHeroHeader` should belong to PR domain UI, not to a vague cross-cutting layer

### Semantic Rule

Folder membership must answer "what is this module?" rather than "where was it convenient to put it?"

## 7. Specific Mismatches to Correct

### `components/common`

Current issue:

- contains both real primitives and usage-specific convenience components

Direction:

- split into true shared primitives vs domain-owned UI
- replace `SubmitButton` with a generic `Button` primitive plus domain/surface composition where needed

### `widgets`

Current issue:

- overloaded between section composition, page assembly, and domain-specific composites

Direction:

- stop using `widgets` as a semantic category
- reclassify modules by domain + UI composition depth

### `features`

Current issue:

- partly use-case orchestration, partly view helpers, partly workflow-specific modules

Direction:

- reserve this axis for use cases only, or rename to `use-cases` under domains
- move pure formatting/selectors into `model` or `adapters`

### `queries`

Current issue:

- technically clear, but too detached from domain ownership

Direction:

- nest queries under domains
- keep query semantics technical, but assign business ownership explicitly

### `entities`

Current issue:

- currently mixes domain model types with route helpers and view-related typing

Direction:

- separate:
  - domain model types/selectors
  - routing/path helpers
  - view-model adapters

Route helpers may live under:

- `domains/<domain>/routing/*`
- or `app/routing/*`

depending on whether they are domain-owned or app-owned

## 8. Migration Strategy

Do not attempt a massive rename-only refactor. Start by defining semantics, then migrate one vertical slice at a time.

### Phase 0 - Taxonomy Audit

Goals:

- classify current modules by actual responsibility
- identify overlap and contradiction
- produce a migration map from current locations to target ownership

Deliverables:

- a file inventory tagged by:
  - domain
  - technical responsibility
  - UI composition depth
  - current mismatch type

Recommended first audit targets:

- `components/common/*`
- `widgets/common/*`
- `widgets/pr/*`
- `features/pr-*`
- `queries/useCommunityPR.ts`
- `queries/useAnchorPR.ts`
- `entities/pr/*`
- the PR detail pages

### Phase 1 - Decide and Document the Taxonomy

Goals:

- lock the target vocabulary before moving files

Decisions to record:

- whether top-level becomes domain-first now or via gradual compatibility facades
- whether `features` is retained as a term or replaced by `use-cases`
- whether `widgets` is fully removed or kept as a temporary compatibility layer

Required output:

- an architecture-governance document
- explicit directory semantics
- import-direction rules

Important note:

- if the team wants minimal churn, temporary barrel/facade modules may be used
- if the team wants stronger long-term clarity, direct migration to domain-first ownership is cleaner

This is the main trade-off checkpoint between short-term churn and long-term readability.

### Phase 2 - Establish New Backbone Without Full Migration

Goals:

- create the target directory backbone
- prove the taxonomy with one or two representative slices

Suggested initial backbone:

- `src/domains/pr/`
- `src/domains/event/`
- `src/shared/ui/`
- `src/app/`

Implementation approach:

- create new homes first
- move or copy a small set of modules
- preserve imports through temporary re-export facades where needed

### Phase 3 - Fix Shared Primitive Layer

Goals:

- clean `shared/common` first because all other layers depend on it

Priority work:

- replace usage-specific "common" components with true primitives
- introduce generic `Button` / `IconButton` / surface/layout primitives where appropriate
- move domain-specific common components into their owning domain

Expected result:

- shared UI becomes stable and predictable

### Phase 4 - Migrate PR Domain Vertically

Goals:

- use the PR flow as the first serious slice because it shows the current overlap most clearly

Recommended PR domain target:

- `domains/pr/model/*`
- `domains/pr/queries/*`
- `domains/pr/use-cases/*`
- `domains/pr/ui/primitives/*`
- `domains/pr/ui/composites/*`
- `domains/pr/ui/sections/*`
- `domains/pr/routing/*`

Targets to reclassify:

- PR route helpers
- PR detail types/view-models
- PR actions orchestration
- PR page sections currently under `widgets/pr`
- PR components currently under `components/pr`

### Phase 5 - Migrate Event, Share, Admin, Auth

Goals:

- repeat the same pattern on remaining domains after PR proves the model

Recommended order:

1. `event`
2. `share`
3. `auth`
4. `admin`

### Phase 6 - Retire Legacy Taxonomy

Goals:

- remove semantic ambiguity once migration coverage is sufficient

Actions:

- delete or freeze `widgets/`
- delete or freeze top-level `features/`
- reduce top-level `queries/` and `entities/` to compatibility facades, then remove them
- update import aliases if needed

## 9. Relation to Token-System Work

The token-system work should continue only through foundational/shared primitives until this architecture plan stabilizes the ownership model.

Rules:

- do not continue broad token migration across pages/widgets while the UI taxonomy is unresolved
- token recipes and design-system primitives should land in shared infrastructure
- domain/surface token adoption should resume after shared primitives and ownership boundaries are clarified

Practical implication:

- Phase 1 token infrastructure may continue
- later token migration phases should pause until at least Phases 1-3 of this architecture plan are done

## 10. File and Doc Changes Expected

Expected new docs:

- `apps/frontend/src/ARCHITECTURE.md`
- optional ADR-style notes under `docs/` or `apps/frontend/src/`

Expected existing docs to update:

- `apps/frontend/AGENTS.md`
- `apps/frontend/src/components/AGENTS.md`
- `apps/frontend/src/queries/AGENTS.md`
- `apps/frontend/src/styles/AGENTS.md`

Expected new code roots:

- `apps/frontend/src/domains/`
- `apps/frontend/src/shared/ui/`
- `apps/frontend/src/app/`

## 11. Definition of Done

This task is complete when:

- the frontend has a documented primary taxonomy and boundary rules
- folder names have non-overlapping semantics
- shared UI contains only true shared primitives
- at least one major domain slice has been migrated end-to-end to the new structure
- import directions are enforceable and mostly respected
- the old ambiguous categories are either retired or explicitly transitional
- subsequent token-system migration can proceed on top of stable ownership boundaries
- `pnpm --filter @partner-up-dev/frontend build` passes

## 12. Validation Plan

### Structural Validation

- every migrated file can answer:
  - what domain owns me?
  - what responsibility kind am I?
  - what layer may depend on me?
- no shared primitive depends on query modules
- no domain model module depends on Vue SFCs
- no usage-specific button remains in shared common primitives

### Build Validation

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm build`

### Runtime Validation

- run the local frontend and validate migrated slices in the browser, not just in typecheck/build
- use `agent-browser` against the live dev server to exercise the affected routes after each major slice
- minimum PR-slice checks:
  - home page still loads and links into migrated flows
  - `communityPRCreatePath()` flow renders in both NL and structured modes
  - at least one community PR detail route renders end to end
  - at least one anchor PR detail route renders end to end
  - branch pages owned by the same slice, such as booking-support or edit/status modals, still mount
- capture runtime caveats separately from architecture regressions:
  - data-specific 404s for a single seeded record do not necessarily mean the ownership migration failed
  - auth-gated 401s should be noted, but not confused with UI-boundary breakage when the rest of the page renders
- close browser sessions after validation to avoid leaking state/processes

### Review Validation

- reviewers should be able to predict module placement without repo folklore
- moving a new PR-related module should no longer require debating between `entities`, `features`, `components`, and `widgets`

## 13. Risks and Trade-offs

- Risk: a large restructure creates temporary churn and import noise.
  - Mitigation: migrate with compatibility facades and one domain slice at a time.

- Risk: preserving old folder names for too long keeps ambiguity alive.
  - Mitigation: mark transitional folders explicitly and set a retirement phase.

- Risk: over-designing the taxonomy slows delivery.
  - Mitigation: validate the structure with the PR domain slice before broad rollout.

- Trade-off: minimal churn vs cleaner end-state.
  - Minimal churn favors temporary facades and partial coexistence.
  - Cleaner end-state favors earlier domain-first migration and faster retirement of legacy categories.

## 14. Suggested Delivery Split

1. PR-1: taxonomy audit + architecture doc
2. PR-2: backbone directories + shared primitive cleanup
3. PR-3: PR domain vertical migration
4. PR-4: remaining domain migrations
5. PR-5: legacy taxonomy retirement + docs finalization
