# Task Packet - Align Repo to SVC v9.7

## MVT Core

- Objective & Hypothesis: Align the current PartnerUp repo, including the frontend unit currently represented by `apps/frontend`, to SVC v9.7 and reduce legacy documentation noise without mutating durable truth prematurely. Hypothesis: the repo is already structurally close enough that the main work is front-door governance, task-layer relocation, glossary ownership, alignment-substrate wording, and legacy-doc cleanup policy rather than a full documentation rebuild.
- Guardrails Touched: do not rewrite PRD / Product TDD / Deployment docs or production code before the durable owner and blast radius are explicit; treat historical task packets as evidence and migration context, not as current truth.
- Verification: produce a current-state baseline, a v9.7 gap map, a phased migration plan, and a legacy-doc inventory under `tasks/align-svc-97/`.

## Exploration Scaffold

- Perturbation: the user requested SVC v9.7 alignment and historical-doc cleanup, and explicitly required a thorough exploration step before any durable mutation.
- Input Type: Constraint
- Active Mode or Transition Note: Mode A / Explore. This packet is the entropy buffer before any Solidify or Execute slice.
- Governing Anchors:
  - `AGENTS.md`
  - `apps/frontend/AGENTS.md`
  - `apps/backend/AGENTS.md`
  - `apps/frontend/src/ARCHITECTURE.md`
  - `docs/15-alignment/*`
  - `docs/10-prd/*`
  - `docs/20-product-tdd/*`
  - `docs/30-unit-tdd/*`
  - `docs/40-deployment/*`
  - `F:/CODING/svc/src/index.md`
  - `F:/CODING/svc/src/sections/filesystem.md`
  - `F:/CODING/svc/src/sections/meta-engine.md`
  - `F:/CODING/svc/src/sections/alignment.md`
  - `F:/CODING/svc/src/sections/tasks.md`
  - `F:/CODING/svc/src/sections/migration-guidance.md`
- Impact Hypothesis:
  - root and package `AGENTS.md` files will need the largest wording changes
  - `docs/00-meta/` will likely need to be restored as a durable layer
  - `tasks/` will need to become the active task layer while `docs/task/` becomes legacy history or archive material
  - `docs/15-alignment/` will likely be rewritten from Alignment Pack language to Alignment Substrate language
  - `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md` will likely split or demote once `docs/10-prd/glossary.md` becomes canonical
- Temporary Assumptions:
  - the user's `partner-up-uniapp` label maps to the current frontend unit under `apps/frontend`
  - repo-wide doc-system alignment must happen before any unit-specific cleanup can be considered complete
  - historical task packets can be deleted directly once the new active navigation path is in place, because the user has explicitly deprioritized provenance retention for this cleanup
- Negotiation Triggers:
  - if `partner-up-uniapp` turns out to be a narrower target than `apps/frontend`
  - if later execution reveals that a durable doc owner is still ambiguous
- Promotion Candidates:
  - typed input taxonomy and mode dispatch guidance in root `AGENTS.md`
  - `docs/00-meta/*`
  - `docs/10-prd/glossary.md`
  - rewritten `docs/15-alignment/*`
  - repo-level cleanup / archival rule for legacy task packets

## Execution Notes

- key findings:
  - the repo currently uses `docs/task/` instead of top-level `tasks/`
  - there is no `docs/00-meta/`
  - the repo still carries a local `docs/_svc_v91.md` snapshot
  - local `src/**/AGENTS.md` usage is already present and partially aligned with SVC v9.7's local-context layer
  - active doc content is more drifted than a pure structure scan suggested: root and package AGENTS are still v9.1-shaped, alignment docs are pre-substrate, and some backend local AGENTS still describe older service-centric ownership
  - the active durable docs were not consistently English; before this slice, PRD and several local AGENTS still used Chinese outside glossary ownership
- decisions made:
  - use `tasks/align-svc-97/` immediately as the active exploration container because the user requested it and because SVC v9.7 makes `tasks/` canonical
  - keep this packet read-only with respect to durable truth until the migration route is explicit
  - Phase 1 will cut over the active front door first, even though package AGENTS, alignment docs, and glossary ownership are still pending
- final outcome:
  - baseline, gap map, plan, and legacy inventory were created for the next Solidify slice
  - Phase 1 implemented root `AGENTS.md` rewrite and created `docs/00-meta/` with typed routes, mode SOPs, and a minimal concept dictionary
  - Phase 2 updated package `AGENTS.md` files to use `docs/00-meta/` plus `tasks/`, and corrected backend local controller/service guidance to stop endorsing the older service-centric default
  - the PRD tree was rewritten into English, `docs/10-prd/glossary.md` was introduced, `vocabulary-and-lifecycle.md` was removed, and the active-doc language rule now holds except for Chinese glossary terms
  - Phase 4 rewrote `docs/15-alignment/*` into the v9.7 Alignment Substrate model and retained `ui-map.yaml` as a minimal hot-surface aid
  - Phase 5 removed the stale local framework snapshot and deleted the historical `docs/task/` corpus after active docs stopped depending on it
  - Phase 6 validation is recorded in `50-validation-sweep.md`; no active SVC v9.7 blocker was found in the checked docs
