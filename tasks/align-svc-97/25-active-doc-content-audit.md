# Active Doc Content Audit

## Purpose

This audit focuses on active durable entry points and local guidance, not on historical task packets. The goal is to determine whether the repo merely has old filenames or whether the actual content model still differs materially from SVC v9.7.

## Overall Judgment

The content-level gap is real and non-trivial.

This repo is not just missing a few directories. Its active documentation front door is still fundamentally v9.1-shaped:

- ambiguity-first instead of typed-input-first
- mode-first instead of route-plus-mode separation
- no `docs/00-meta/` owner for route protocols and SOPs
- task-path and glossary-path still anchored to old local decisions

By contrast, Product TDD and Deployment content are much closer to acceptable owner purity. The largest content debt is concentrated in root/package/local `AGENTS.md`, alignment docs, and PRD vocabulary ownership.

## High-Severity Findings

### 1. Root AGENTS is still a v9.1 front door, not a v9.7 front door

Observed symptoms:

- it dispatches primarily through volatility and `Mode A/B/C`
- it has no typed perturbation taxonomy (`Intent`, `Constraint`, `Reality`, `Artifact`)
- it routes exploration into `docs/task/`
- it has no `Mode D: Diagnose`
- it has no route/mode separation and no `docs/00-meta/` owner

Why this matters:

- under v9.7, this is not a wording issue; it changes how ownership and blast radius are determined before mutation
- keeping the current root AGENTS would make later partial updates inconsistent by design

### 2. Package AGENTS files still contradict the v9.7 task and meta model

Observed symptoms:

- `apps/frontend/AGENTS.md` and `apps/backend/AGENTS.md` still route volatile work into `docs/task/<task>/`
- neither package guide includes `docs/00-meta/` in its read order
- root and package guidance therefore disagree with the v9.7 filesystem and dispatcher model

Why this matters:

- even if root AGENTS is fixed, package-level read paths would continue pulling agents back into the old system

### 3. Alignment docs are structurally and semantically pre-v9.7

Observed symptoms:

- `docs/15-alignment/README.md` is still titled `Alignment Pack`
- it mostly describes shared naming / anchors, not the seven coordination primitives
- `change-request-template.md` only captures target, scope, invariants, and uncertainty
- there is no `from -> to` desired-state diff
- there is no blast-radius forecast or verification contract
- the relationship between alignment grammar and pre-execution handshake is absent

Why this matters:

- under v9.7, alignment is no longer a small appendix of labels; it is the coordination grammar used when MVT is insufficient

### 4. PRD glossary ownership is still wrong

Observed symptoms:

- there is no `docs/10-prd/glossary.md`
- product vocabulary still lives in `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`
- root `AGENTS.md` still points to that file as the glossary reference

Why this matters:

- this keeps business vocabulary mixed with lifecycle semantics and blocks a clean v9.7 PRD structure

## Medium-Severity Findings

### 5. One PRD driver file mixes product truth with doc-system / migration reality

Observed symptoms:

- `docs/10-prd/_drivers/operational-realities.md` includes statements such as old/new doc systems coexisting and technical/documentation migration still being underway

Why this matters:

- those are repository documentation-state realities, not product-operational realities
- they belong in task packets or doc-system migration notes, not in product drivers

### 6. Backend local AGENTS contain stale or ambiguous architecture guidance

Observed symptoms:

- `apps/backend/src/controllers/AGENTS.md` tells controllers to call `Service`
- `apps/backend/src/services/AGENTS.md` frames `src/services` as the business-rule owner that orchestrates repositories
- package-level backend AGENTS, however, says new code should go through domain use-cases directly and that `src/services/` is legacy facade territory

Why this matters:

- this is not necessarily runtime-wrong, but it is contribution-guidance drift
- a new agent could still choose an outdated service-centric path because the nearest local guidance appears to endorse it

### 7. Root anchor / restatement model is still narrower than the v9.7 impact handshake

Observed symptoms:

- root AGENTS defines target / scope / invariants / uncertainty
- it does not require typed route classification first
- it does not restate `From -> To`, blast radius forecast, or explicit verification as part of an impact handshake

Why this matters:

- the current protocol is serviceable for v9.1 but weaker than the v9.7 non-local mutation guardrail

## Low-Severity or Mostly-Aligned Areas

### 8. Product TDD is mostly owner-clean

Assessment:

- `docs/20-product-tdd/*` generally keeps to cross-unit contracts, authority boundaries, and realization mapping
- it is not the main source of SVC drift

Minor notes:

- index references still assume the older front door and older alignment doc naming
- these should be updated when the surrounding model is rewritten

### 9. Deployment docs are mostly owner-clean

Assessment:

- `docs/40-deployment/*` remains focused on runtime / rollout / observability / recovery
- this layer does not currently look like the main blocker for v9.7 alignment

Minor notes:

- it will need read-path and terminology cleanup once root/meta layers move

### 10. Many frontend local AGENTS are already close to the intended local-context role

Assessment:

- examples such as `apps/frontend/src/shared/ui/AGENTS.md`, `apps/frontend/src/styles/AGENTS.md`, and `apps/frontend/src/queries/AGENTS.md` are concise, tactical, and close to target-code usage

Why this matters:

- the repo already has part of the v9.7 pacing-layer idea in practice
- the cleanup should preserve this strength instead of over-rewriting local docs

## Conclusion

The user's suspicion is correct:

- the repo has larger active-content drift than a directory-only scan would show
- the highest-value correction is still front-door governance and durable-owner cleanup, not broad TDD rewriting
- however, a few local backend AGENTS also need direct correction because they can misroute future code edits
