# PLAN - Refactor Documentation System

## 1. Goal

Refactor the documentation system in controlled phases instead of one hard cutover.

The immediate goal of this task is to establish the new durable foundation for:

- `docs/00-meta`
- `docs/10-prd`

This task will continue to use `docs/task/refactor-doc-system` for planning and execution tracking. We are intentionally **not** introducing a new top-level `tasks/` system in this phase.

## 2. Why Stage It

The target document system has real dependency order:

1. `00-meta` defines canonical ontology, intake, promotion, and read rules.
2. `10-prd` depends on that kernel to avoid drifting into architecture.
3. `20-product-tdd` depends on stable PRD claims, workflows, and boundaries.
4. `30-unit-tdd` depends on stable technical-unit decomposition.
5. `40-deployment` depends on the system/runtime split being explicit.

Trying to rewrite all layers at once would increase risk in three ways:

- the same concepts would be redefined differently across layers
- the durable product layer and technical layer would likely get mixed
- review would be too large to validate for correctness

## 3. Working Strategy

Use a hybrid transition instead of a monolithic rewrite:

- Introduce the new durable layers gradually.
- Cut over one stable layer at a time.
- Keep `docs/task/` as the transient execution area until the durable layers above it are stable enough.
- Do not rewrite historical `docs/plan/*` and `docs/task/*` material as part of this first phase.

This means the documentation system will temporarily be mixed:

- new durable layers under `docs/00-meta` and `docs/10-prd`
- existing technical/runtime/task materials remain where they are

That temporary inconsistency is acceptable because it preserves reviewability and makes dependency order explicit.

## 4. Phase 1 Scope: Meta

### Deliverables

- Create `docs/00-meta/` with:
  - `concepts.md`
  - `intake-protocol.md`
  - `promotion-rules.md`
  - `doc-system.md`
- Define a repo-local read order that works during the hybrid state.
- Define what belongs in PRD, Product TDD, Unit TDD, Deployment, and `docs/task`.
- Define promotion rules for moving stable truth out of task docs.

### Source Material

- `sustainable_vibe_coding_framework_v_7.md`
- root `AGENTS.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- the current `docs/product/*` corpus
- the current `docs/deployment/*` corpus, only for classification boundaries

### Acceptance Criteria

- Kernel documents are short, canonical, and non-redundant.
- The meta layer defines terms and rules without embedding product-specific business content.
- The hybrid read order is explicit enough that future tasks know whether to read `docs/product/*` or `docs/10-prd/*`.
- `docs/task` remains allowed as the transient working area in this repo state.

## 5. Phase 2 Scope: PRD

### Deliverables

- Create `docs/10-prd/` with:
  - `index.md`
  - `_drivers/market-and-user-pressures.md`
  - `_drivers/business-and-service-objectives.md`
  - `_drivers/hard-constraints.md`
  - `_drivers/operational-realities.md`
  - `behavior/claims.md`
  - `behavior/capabilities.md`
  - `behavior/workflows.md`
  - `behavior/rules-and-invariants.md`
  - `behavior/scope.md`
  - `domain-structure/derived-boundaries.md`
  - `domain-structure/vocabulary-and-lifecycle.md`
  - `domain-structure/cross-domain-interactions.md`
- Migrate durable product truth out of:
  - `docs/product/overview.md`
  - `docs/product/glossary.md`
  - `docs/product/features/*.md`
- Leave no important durable product truth trapped only in the old `docs/product/*` files.

### Migration Rules

- PRD starts from product pressure, claims, workflows, and rules.
- Domain structure is derived and must not silently redefine upstream product truth.
- Page-level feature docs should be decomposed by durable meaning, not copied one-to-one into the new tree.
- If an old feature doc contains runtime or implementation detail, move that content upward or defer it to later technical phases instead of forcing it into PRD.

### Acceptance Criteria

- The new PRD can explain the product without relying on `docs/product/overview.md`.
- Claims, workflows, and rules are separable from technical realization.
- Core vocabulary is aligned with `docs/00-meta/concepts.md`.
- The remaining old `docs/product/*` files are either removed or clearly transitional by the end of the PRD cutover.

## 6. Deferred Phases

These are intentionally **not** part of the first implementation slice, but Phase 1 and Phase 2 must prepare for them.

### Phase 3 - Product TDD

- Create `docs/20-product-tdd/`
- Define technical units, authority boundaries, coordination model, and claim realization
- Decide how `apps/backend` and `apps/frontend` map to technical units

### Phase 4 - Unit TDD

- Create `docs/30-unit-tdd/`
- Split local technical design by unit
- Move durable technical detail out of package-local AGENTS where appropriate

### Phase 5 - Deployment

- Create `docs/40-deployment/`
- Decompose `docs/deployment/backend-fc-cd.md` into runtime-truth documents
- Separate deployment-shaping constraints from runtime operations

### Phase 6 - Task System Follow-up

- Re-evaluate whether `docs/task` should remain the transient workspace
- Only consider moving to a different task layout after durable layers are stable
- This is a separate decision, not an automatic consequence of introducing `00-meta`

## 7. Change Policy During This Task

- Do not attempt full historical migration of existing `docs/task/*` and `docs/plan/*`.
- Do not rename every old document immediately.
- Do not update all local AGENTS files in the same change unless the new read order is already stable enough.
- Prefer small, reviewable slices with explicit cutover points.

## 8. Proposed Execution Order

1. Create `docs/00-meta` and write the four kernel documents.
2. Add a migration note in this task folder capturing how old durable docs map into the new PRD layout.
3. Create `docs/10-prd/index.md` and the empty or partial structure required for migration.
4. Migrate product overview, glossary, feature truth, and scope into the PRD tree.
5. Update root `AGENTS.md` so the canonical durable read order points to `00-meta` and `10-prd`, while still allowing `docs/task`.
6. Validate by reading the new PRD alone and checking that it still describes the current product correctly.

## 9. Validation

- Structural validation:
  - required directories and files exist
  - layer responsibilities are explicit
  - no kernel file becomes a product-specific dump
- Consistency validation:
  - product claims and rules appear in PRD, not in meta
  - technical realization detail is not prematurely pulled into PRD
  - the same term is not defined differently in multiple places
- Build validation:
  - `pnpm build`
- Search validation:
  - repo-wide search for old path references after each cutover step

## 10. Immediate Next Step

After Meta, PRD, Product TDD, and Unit TDD are in place:

- review whether any remaining durable technical truth is still stranded only in package-local AGENTS or legacy docs
- start the deployment-layer migration into `docs/40-deployment`
- keep `docs/task` as the transient workspace until the deployment layer is stable enough
