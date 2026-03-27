# Remediation Plan - Documentation Inconsistencies and SVC v8 Alignment

## Goal

Use the diagnosis result in `RESULT.md` to fix factual documentation drift while reshaping the durable doc system toward Sustainable Vibe Coding Framework v8.

This plan intentionally does **not** treat every diagnosis item as "add more prose". The governing rule is:

- correct product truth in PRD
- preserve cross-unit technical truth only where durable prose is justified
- move operational truth to deployment docs
- prefer code, types, tests, and CI guardrails over exhaustive prose inventories

## Inputs

- `docs/task/diagnose-doc-260326/RESULT.md`
- `C:/Users/yyh/Downloads/sustainable_vibe_coding_framework_v_8.md`
- the repo's durable docs before and during remediation across `docs/10-prd`, `docs/20-product-tdd`, `docs/30-unit-tdd`, and `docs/40-deployment`

## Current Progress

- Phase 1 applied: root `AGENTS.md` now owns repo-local navigation and `docs/00-meta/*` has been removed.
- Phase 2 applied: PRD now reflects event-scoped user-managed Anchor PR creation and the visible lifecycle state set including `LOCKED_TO_START`.
- Phase 3 applied: Product TDD has been collapsed to the V8 core file set.
- Phase 4 applied: broad frontend/backend Unit TDD folders have been removed; `docs/30-unit-tdd/` is now an optional shell only.
- Remaining follow-up is mainly mechanical drift guardrails and any additional deployment-layer tightening that proves necessary.

## Target End State

- Keep `docs/task/*` as the repo's task-packet location for now; do not spend this branch on a path migration to top-level `tasks/`.
- Root `AGENTS.md` becomes the practical operating guide and primary doc-navigation rule. `docs/00-meta/*` should be removed or collapsed aggressively unless a file still answers an expensive repo-wide question.
- `docs/10-prd/*` owns product what/why, user-visible workflows, rules, and scope only.
- `docs/20-product-tdd/*` is reduced to the V8-style cross-unit set:
  - `index.md`
  - `unit-topology.md`
  - `system-state-and-authority.md`
  - `cross-unit-contracts.md`
  - `claim-realization-matrix.md`
- `docs/30-unit-tdd/*` exists only for genuinely hard local units. Broad "frontend" and "backend" unit folders are presumed over-broad until re-justified.
- `docs/40-deployment/*` owns runtime topology, release/recovery, observability, and operational interfaces such as `/health`.
- Anything cheaper to enforce mechanically should leave prose and move to code, type-level checks, tests, or CI.

## Diagnosis To Owner Mapping

### A2. Anchor PR creation contradiction

Destination:

- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/10-prd/behavior/scope.md`

Plan:

- Update PRD to reflect current product truth: user-managed Anchor PR creation exists as a controlled path within event/batch flows.
- Keep the distinction that there is still no generic standalone "create any Anchor PR anywhere" surface unless code actually provides one.

Reason:

- This is a user-visible product-path truth, so it belongs in PRD rather than technical docs.

### A1. `LOCKED_TO_START` / lifecycle under-specification

Destination:

- PRD for user-visible lifecycle and join-lock behavior
- Product TDD for the exact cross-unit status contract if durable prose is still needed
- code/tests/type checks for enum exhaustiveness and transition safety

Plan:

- Update PRD to describe the behavior that users and operators observe: the pre-start lock window, join restrictions, and how confirmation timing affects participation.
- Do **not** force PRD to become the canonical storage of every runtime enum name unless the name itself is product-facing.
- If the exact status set must remain durable prose, document it once in Product TDD and let frontend/backend/unit docs inherit it.

Reason:

- V8 keeps PRD focused on product truth and treats implementation-form status enumerations as technical truth or mechanical guardrail territory.

### B1. Frontend route inventory incompleteness

Destination:

- PRD for stable user-facing routes and workflows only where they matter to product behavior
- Product TDD for cross-unit route/API families that materially affect system coordination
- code or generated artifacts for exhaustive route inventory if that inventory is truly needed

Plan:

- Stop treating `docs/30-unit-tdd/frontend/interfaces.md` as a pseudo-canonical full route list.
- Promote stable, user-visible route surfaces into PRD only when they matter to workflows or scope.
- Keep exhaustive route inventory out of durable prose unless there is a demonstrated review/operations need that code search cannot satisfy.

Reason:

- V8 explicitly rejects durable prose that behaves like a second runtime map when code already owns the exact route inventory.

### B2. "Interfaces" wording ambiguity

Destination:

- `AGENTS.md`
- Product TDD / Unit TDD only if those files survive the V8 audit

Plan:

- Add a simple owner rule: a document named `interfaces` must declare whether it is full, scoped, or illustrative.
- Prefer deleting ambiguous broad interface docs instead of keeping them with weak semantics.

Reason:

- The underlying issue is not wording alone; it is unclear ownership and unjustified prose surface area.

### C1. Backend admin API under-representation

Destination:

- PRD for admin/operator workflows that are part of the product offering
- Product TDD for durable admin contract families that matter across frontend/backend coordination
- code for exhaustive endpoint inventory

Plan:

- Document admin booking execution, anchor management, booking-support, and POI management only to the depth needed to explain operator workflows and cross-unit contracts.
- Do not hand-maintain a complete admin endpoint catalog in durable prose unless repeated failures show that code/type guardrails are insufficient.

Reason:

- The durable truth here is workflow and cross-unit contract shape, not every controller path.

### C2. `/health` omission

Destination:

- `docs/40-deployment/*`

Plan:

- Keep `/health` as an operational interface in deployment/observability docs.
- Only mention it elsewhere if another doc needs a brief cross-link.

Reason:

- `/health` is runtime/observability truth, not core product or broad unit-design truth.

## Execution Plan

### Phase 1. Fix owner boundaries before fixing text

- Write the V8 destination rule into the active task packet and later into root `AGENTS.md`.
- Produce a migration map from current durable docs to their V8 destination: keep, merge, demote, or delete.
- Treat `docs/00-meta/*` as the first deletion/merge candidates instead of assuming they remain canonical.

Acceptance:

- Every diagnosed inconsistency has one clear durable owner or a decision to move it into mechanical guardrails.

### Phase 2. Correct PRD truth without turning PRD into architecture

- Update `docs/10-prd/*` to fix the Anchor PR creation contradiction.
- Clarify lifecycle behavior around confirmation windows and lock-to-start semantics.
- Ensure workflows, rules, and scope describe the current product accurately without copying implementation structure into PRD.

Acceptance:

- A product reviewer can read PRD and understand the real current behavior without consulting code or old task packets.

### Phase 3. Shrink Product TDD to the V8 core

- Keep only the minimal V8 Product TDD set.
- Merge or demote current extras:
  - `system-objective.md`
  - `unit-boundary-rules.md`
  - `unit-to-container-mapping.md`
  - `coordination-model.md`
  - `failure-and-recovery-model.md`
  - `deployment-shaping-constraints.md`
- Re-home any durable exact lifecycle/status contract here if it remains necessary after the PRD rewrite.

Acceptance:

- Product TDD explains cross-unit design without repeating PRD or acting as a generic architecture wiki.

### Phase 4. Re-justify or delete Unit TDD

- Audit `docs/30-unit-tdd/frontend/*` and `docs/30-unit-tdd/backend/*` against the V8 admission rule.
- Delete broad frontend/backend unit folders if they only restate package purpose, route lists, or implementation shape already visible in code and package AGENTS.
- If a true hard unit needs durable memory, replace broad package folders with narrow unit folders named after the hard responsibility they protect.

Acceptance:

- No Unit TDD remains unless it answers a hard local question that code and Product TDD do not answer cheaply.

### Phase 5. Re-home operational truth

- Keep deployment docs small and operational.
- Ensure `/health`, runtime topology, release/migration constraints, and recovery hazards live under `docs/40-deployment/*`.
- Merge or rename deployment docs only when the new shape is clearer than the current one.

Acceptance:

- Operational truths are discoverable without backsliding into backend pseudo-interface documentation.

### Phase 6. Add mechanical drift guardrails

- Preserve Hono RPC `AppType` typing as the primary API-shape guardrail.
- Add or tighten exhaustiveness checks for PR status usage across backend/frontend where cheap.
- If route or endpoint completeness repeatedly drifts, prefer generated inventories or validation scripts over hand-maintained prose lists.

Acceptance:

- The highest-risk drift points are protected by code, types, tests, or CI rather than duplicated documentation.

## Suggested Change Order For This Branch

1. Record the V8 remediation plan and migration map.
2. Update root `AGENTS.md` to reflect the leaner owner model and remove dependence on `docs/00-meta/*`.
3. Fix PRD contradictions and under-specification.
4. Collapse Product TDD to the minimal V8 core.
5. Audit and likely remove broad Unit TDD folders.
6. Re-home remaining operational truth into deployment docs.
7. Add lightweight mechanical guardrails where prose was intentionally deleted.

## Non-Goals

- rewriting historical `docs/plan/*` or inactive `docs/task/*` packets
- hand-maintaining exhaustive route or endpoint catalogs as durable prose
- introducing new durable layers beyond PRD, Product TDD, optional Unit TDD, Deployment, and task packets
- performing a repo-wide path migration from `docs/task/*` to top-level `tasks/` in this branch
