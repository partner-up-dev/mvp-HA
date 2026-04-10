# Proposed Migration Plan Toward SVC v9.7

## Strategy

Do not start by mass-editing every old doc that mentions a superseded path.

Recommended strategy:

1. establish the v9.7 front door and active task path
2. restore the missing durable owners (`docs/00-meta/`, `docs/10-prd/glossary.md`)
3. rewrite active alignment and package guidance
4. delete historical task packets and stale framework mirrors once active navigation has cut over
5. delete only the stale artifacts whose replacement is already explicit

This keeps the migration reviewable and avoids losing provenance before the new navigation system exists.

## Phase 0 - Exploration Packet

Status:

- completed in this task folder

Outputs:

- `00-task-packet.md`
- `10-current-baseline.md`
- `20-v97-gap-map.md`
- `25-active-doc-content-audit.md`
- `40-legacy-doc-inventory.md`

Exit condition:

- the current-state baseline and the target-state deltas are explicit enough to begin Solidify work

## Phase 1 - Front Door and Filesystem Cutover

Status:

- completed

Target:

- root `AGENTS.md`
- new `docs/00-meta/`
- new top-level `tasks/` as the active task layer

Actions:

- rewrite root `AGENTS.md` to the v9.7 typed-dispatch shape
- add the minimal `docs/00-meta/` file set:
  - `input-intent.md`
  - `input-constraint.md`
  - `input-reality.md`
  - `input-artifact.md`
  - `mode-a-explore.md`
  - `mode-b-solidify.md`
  - `mode-c-execute.md`
  - `mode-d-diagnose.md`
  - `concepts.md`
- define `tasks/` as the active entropy buffer
- mark `docs/task/` as legacy history, not the active route

Why first:

- until the front door changes, every later doc update will keep pointing readers back into the old model

Verification:

- root `AGENTS.md` points to `docs/00-meta/` and `tasks/`
- active guidance no longer routes new work to `docs/task/`

## Phase 2 - Package and Local Guidance Update

Status:

- completed

Target:

- `apps/frontend/AGENTS.md`
- `apps/backend/AGENTS.md`
- any local `AGENTS.md` that currently needs route-path wording cleanup

Actions:

- switch volatile-work references from `docs/task/` to `tasks/`
- add `docs/00-meta/` to the read order where appropriate
- preserve local tactical rules; only change the routing and owner language

Verification:

- package `AGENTS.md` files no longer contradict the root route model

## Phase 3 - PRD Vocabulary Ownership Fix

Status:

- completed, expanded to include English rewrite and PRD purity cleanup

Target:

- `docs/10-prd/glossary.md`
- `docs/10-prd/index.md`
- `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`
- any references pointing at the old path

Actions:

- create `docs/10-prd/glossary.md` as the canonical business vocabulary boundary
- split the current mixed file so lifecycle semantics stay where they belong and glossary entries move to `glossary.md`
- update root / package docs that still reference `vocabulary-and-lifecycle.md` as the glossary owner

Verification:

- active docs reference `docs/10-prd/glossary.md`
- no active owner doc claims that the glossary lives in `domain-structure/vocabulary-and-lifecycle.md`

## Phase 4 - Alignment Pack to Alignment Substrate Rewrite

Target:

- `docs/15-alignment/README.md`
- `docs/15-alignment/change-request-template.md`
- `docs/15-alignment/ui-map.yaml`
- root / index references to alignment docs

Actions:

- rename the layer conceptually from Alignment Pack to Alignment Substrate
- rewrite the README around the seven coordination primitives:
  - object
  - address
  - operation
  - boundary / invariants
  - state / context
  - evidence
  - protocol
- replace the current short change-request template with a state-diff / blast-radius / verification-oriented template
- decide whether `ui-map.yaml` should survive as a justified partial aid or be reduced further in favor of stable-anchor guidance

Verification:

- active docs no longer use `Alignment Pack`
- the request template captures `from -> to`, blast radius, and verification contract

## Phase 5 - Legacy Doc Cleanup

Target:

- stale repo-level framework mirrors
- superseded meta-alignment task packets
- old task history path strategy

Recommended cleanup order:

1. delete `docs/_svc_v91.md`
2. delete clearly superseded doc-system task packets:
   - `docs/task/align-svc-v9/*`
   - `docs/task/diagnose-doc-260326/*`
   - `docs/task/refactor-doc-system/*`
3. delete the rest of `docs/task/` historical packets after any still-needed references have been rewritten into the new active docs

Recommendation:

- per user preference, do not spend time on historical normalization or archive choreography
- keep the deletion blast radius bounded by rewriting active references first, then removing the obsolete corpus directly

Verification:

- active read paths no longer rely on superseded task folders
- clearly stale framework mirrors are gone

## Phase 6 - Validation Sweep

Validation methods:

- repo-wide search for:
  - `docs/task/`
  - `docs/00-meta` absence in active guidance
  - `Alignment Pack`
  - `vocabulary-and-lifecycle.md` used as glossary owner
  - `_svc_v91.md`
- structural checks:
  - `docs/00-meta/` exists
  - `tasks/` exists and is the active task path
  - `docs/10-prd/glossary.md` exists
- targeted doc read-through:
  - root `AGENTS.md`
  - package `AGENTS.md`
  - `docs/10-prd/index.md`
  - `docs/15-alignment/README.md`

## Open Decisions for Later Solidify

1. Should `docs/15-alignment/ui-map.yaml` stay as a partial surface map, or should it be cut back in favor of stable-anchor rules only?
2. Should `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md` keep only lifecycle semantics, or should it disappear after the glossary split?

## Recommended Next Execute Slice

If the user approves the route, the next high-value slice is:

1. Phase 1 front-door / filesystem cutover
2. Phase 2 package guidance update
3. the smallest Phase 5 cleanup needed to stop active reading drift
