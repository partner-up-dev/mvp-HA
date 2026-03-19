# Align Frontend Architecture Again

## Status

Draft. Awaiting approval before implementation.

## Why This Task Exists

The current `apps/frontend` structure is broadly moving toward the architecture described in `apps/frontend/src/ARCHITECTURE.md`, but several verified seams are still misaligned:

- domain `ui/primitives` in `domains/event` import types from query modules
- route pages still own reusable workflow and orchestration logic
- app bootstrapping and router wiring still live outside `src/app`
- top-level legacy buckets such as `lib`, `stores`, and `router` are still active ownership homes instead of temporary seams

This task is to align implementation with the documented ownership and dependency rules without changing product behavior.

## Goals

- Remove confirmed boundary violations against `src/ARCHITECTURE.md`
- Make `pages` thinner route entrypoints
- Move app wiring toward `src/app`
- Reduce reliance on legacy top-level ownership buckets
- Keep user-facing behavior unchanged
- Keep the frontend build passing

## Non-Goals

- No redesign of page UX or visual system
- No backend contract changes
- No broad renaming for cosmetic consistency only
- No speculative migration of every helper under `lib` if the ownership is still unclear

## Scope

### In Scope

1. Event domain type ownership
   - Introduce domain-owned model types or adapters in `src/domains/event/model`
   - Update `ui/primitives` to depend on domain model types instead of query modules

2. PR detail page thinning
   - Extract reusable orchestration from `CommunityPRPage.vue` and `AnchorPRPage.vue`
   - Move polling, reminder workflow, POI gallery derivation, and related page-level business coordination into domain `use-cases` and/or domain `ui/sections`
   - Leave pages as route entrypoints that compose domain modules

3. App wiring alignment
   - Move app bootstrap, provider setup, and router wiring toward `src/app`
   - Keep imports stable or add thin compatibility seams if needed during migration

4. Legacy ownership seam reduction
   - Migrate the most obviously cross-domain infrastructure from top-level `lib`, `stores`, and `router` into `shared` or `app`
   - Only move modules whose ownership is already clear from current usage

5. Documentation alignment
   - Update `apps/frontend/src/ARCHITECTURE.md` or `apps/frontend/AGENTS.md` if implementation decisions require clarifying temporary seams

### Out of Scope for This Pass

- Full elimination of every top-level legacy folder in one sweep
- Refactoring unrelated pages that are already thin enough
- Token-system migration work unrelated to architecture ownership

## Proposed Execution Order

### Phase 1: Fix hard boundary violations

- Add `domains/event/model/*`
- Replace query-type imports in event UI primitives with model-owned types
- Verify no domain UI primitive imports any query module

### Phase 2: Extract PR detail orchestration

- Create focused PR detail use-cases for shared polling and reminder workflow
- Move reusable logic out of:
  - `src/pages/CommunityPRPage.vue`
  - `src/pages/AnchorPRPage.vue`
- Keep route parsing and final page composition in the page files

### Phase 3: Move app wiring into `src/app`

- Relocate bootstrap/provider/router setup into `src/app/*`
- Keep `main.ts` as a thin entrypoint if Vite still expects it
- Keep behavior identical

### Phase 4: Reduce legacy top-level ownership seams

- Move clearly generic browser/date/session helpers from `lib` and `stores` into `shared` or `app`
- Avoid risky moves where ownership is ambiguous

### Phase 5: Verification and documentation

- Run frontend build
- Update architecture docs only where the implemented boundary decisions need to be recorded

## Acceptance Criteria

- Event `ui/primitives` no longer import query modules
- `CommunityPRPage.vue` and `AnchorPRPage.vue` are materially thinner and no longer own reusable workflow logic
- App bootstrap and router wiring have an explicit home under `src/app`
- Legacy top-level modules that remain are either temporary seams with clear reason or have been moved
- `pnpm --filter @partner-up-dev/frontend build` passes

## Risks and Trade-Offs

- Moving app wiring and session/date helpers too aggressively can create noisy import churn with limited value
- Over-extracting page logic into tiny composables can satisfy folder rules while hurting readability
- Some top-level modules may still need to remain as temporary seams if their ownership is not yet stable

## Implementation Preference

Prefer a staged migration with thin compatibility seams over a single large rename-heavy rewrite.

## Approval Needed

Please approve this plan before implementation. If approved, I will execute it in the phase order above and keep scope limited to architecture alignment rather than feature work.
