# SVC v9.1 Drift Diagnosis

## Scope

This diagnosis updates the prior drift report against SVC v9.1 (not v9).

In scope:

- [AGENTS.md](AGENTS.md)
- [apps/backend/AGENTS.md](apps/backend/AGENTS.md)
- [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md)
- [docs/10-prd/index.md](docs/10-prd/index.md) and all markdown files under [docs/10-prd](docs/10-prd)
- [docs/20-product-tdd/index.md](docs/20-product-tdd/index.md) and all markdown files under [docs/20-product-tdd](docs/20-product-tdd)
- [docs/30-unit-tdd/index.md](docs/30-unit-tdd/index.md)
- [docs/40-deployment/index.md](docs/40-deployment/index.md) and all markdown files under [docs/40-deployment](docs/40-deployment)
- v9.1 framework reference: [docs/_svc_v91.md](docs/_svc_v91.md)

Out of scope by rule:

- Contents under [docs/task](docs/task) are excluded from content-level diagnosis in this pass.
- Contents under [docs/plan](docs/plan) are not read because [AGENTS.md](AGENTS.md) says plan docs are temporary and should not be read/updated.

Assessment labels:

- Aligned: materially consistent with SVC v9.1 intent.
- Partial: mostly aligned but has meaningful drift.
- Drift: clear mismatch that should be corrected.

## Delta From Previous Report

Closed drifts since last run:

1. Root AGENTS now includes a pre-execution restatement protocol.
2. Backend and frontend AGENTS no longer maintain large feature-state mirrors.
3. Root AGENTS now includes v9.1 Dynamic Execution Protocol (Mode A/B/C).
4. Root AGENTS now includes Task-First guardrail for high-volatility prompts.

Remaining important under v9.1:

1. Guardrail wording around tests is still weaker than v9.1 principle 1.2.
2. Temporary-doc entropy remains high without explicit cleanup cadence.

## Task Breakdown By SVC v9.1 Sections

### S0 Purpose

Status: Partial

Findings:

- The repository remains close to the selective-memory model.
- v9.1 dynamic ambiguity navigation is now encoded in AGENTS through explicit execution modes.

Evidence:

- [docs/_svc_v91.md](docs/_svc_v91.md)
- [AGENTS.md](AGENTS.md)

### S1 Core Principles

Status: Partial

Findings:

- 1.1, 1.3, 1.4, 1.5: mostly aligned across PRD/TDD layering.
- 1.2: still drifted by root guidance that de-emphasizes test maintenance.
- 1.7, 1.8: aligned via anchor-based restatement plus dynamic mode selection and task-first routing.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs/10-prd/index.md](docs/10-prd/index.md)
- [docs/20-product-tdd/index.md](docs/20-product-tdd/index.md)

### S2 Layer Model

Status: Aligned

Findings:

- Durable layers remain clearly owned and separated.
- Task layer exists and is explicitly temporary.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs/10-prd/index.md](docs/10-prd/index.md)
- [docs/20-product-tdd/index.md](docs/20-product-tdd/index.md)
- [docs/30-unit-tdd/index.md](docs/30-unit-tdd/index.md)
- [docs/40-deployment/index.md](docs/40-deployment/index.md)

### S3 Minimal Filesystem

Status: Partial

Findings:

- Durable structure is still coherent.
- Temporary artifact pressure remains high: 92 markdown files under task and 41 under plan.

Evidence:

- [docs/task](docs/task)
- [docs/plan](docs/plan)

### S4 AGENTS.md And Execution Protocol

Status: Aligned

#### S4.1 Pre-Execution Restatement Rule

Status: Aligned

Findings:

- Root AGENTS now includes target, anchor formats, context, operation, scope, invariants, affected files, and uncertainty.

Evidence:

- [AGENTS.md](AGENTS.md)

#### S4.2 Dynamic Execution Protocol (Mode A/B/C)

Status: Aligned

Findings:

- Root AGENTS defines Mode A (Exploration), Mode B (Solidification), and Mode C (Execution).
- AGENTS now explicitly requires volatility assessment and task-first handling for exploration-phase requests.

Evidence:

- [docs/_svc_v91.md](docs/_svc_v91.md#L114)
- [AGENTS.md](AGENTS.md)

### S5 Alignment Pack

Status: Partial

Findings:

- No 15-alignment folder currently exists, which is acceptable if ambiguity drift is manageable.
- Current AGENTS now has anchor formats, but there is still no shared alignment artifact set for recurring hot surfaces.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs](docs)

### S6 PRD

Status: Aligned

Findings:

- PRD still cleanly owns product what/why, claims, workflows, invariants, and scope.
- Derived domain structure is explicit and mostly well bounded.

Evidence:

- [docs/10-prd/index.md](docs/10-prd/index.md)
- [docs/10-prd/behavior/claims.md](docs/10-prd/behavior/claims.md)
- [docs/10-prd/behavior/workflows.md](docs/10-prd/behavior/workflows.md)
- [docs/10-prd/behavior/rules-and-invariants.md](docs/10-prd/behavior/rules-and-invariants.md)

### S7 Product TDD

Status: Aligned

Findings:

- Cross-unit topology, authority, contracts, and claim realization remain present and coherent.
- No material v9.1-specific drift detected here.

Evidence:

- [docs/20-product-tdd/index.md](docs/20-product-tdd/index.md)
- [docs/20-product-tdd/unit-topology.md](docs/20-product-tdd/unit-topology.md)
- [docs/20-product-tdd/system-state-and-authority.md](docs/20-product-tdd/system-state-and-authority.md)
- [docs/20-product-tdd/cross-unit-contracts.md](docs/20-product-tdd/cross-unit-contracts.md)

### S8 Unit TDD

Status: Aligned (watch)

Findings:

- Optional-only policy remains correct.
- Still no active hard-unit folder; acceptable until repeated local regressions justify one.

Evidence:

- [docs/30-unit-tdd/index.md](docs/30-unit-tdd/index.md)

### S9 Deployment Docs

Status: Aligned

Findings:

- Runtime, rollout, observability, and recovery are still correctly placed in deployment layer.

Evidence:

- [docs/40-deployment/index.md](docs/40-deployment/index.md)
- [docs/40-deployment/environments.md](docs/40-deployment/environments.md)
- [docs/40-deployment/rollout.md](docs/40-deployment/rollout.md)
- [docs/40-deployment/observability.md](docs/40-deployment/observability.md)
- [docs/40-deployment/recovery.md](docs/40-deployment/recovery.md)

### S10 Tasks

Status: Partial

Findings:

- Task layer remains temporary and active.
- AGENTS explicitly routes Mode A exploration into task packets before durable-doc or code promotion.

Evidence:

- [docs/_svc_v91.md](docs/_svc_v91.md#L189)
- [AGENTS.md](AGENTS.md)
- [docs/task](docs/task)

### S11 Promotion Rules

Status: Aligned

Findings:

- Root AGENTS now codifies an explicit promotion test, destination rules, and demotion rule.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs/10-prd/index.md](docs/10-prd/index.md)
- [docs/20-product-tdd/index.md](docs/20-product-tdd/index.md)

### S12 Anti-Patterns Check

Status: Partial

Observed risks:

- Root AGENTS still weakens implementation-guardrail posture (No need to maintain tests).
- v9.1 anti-pattern 12.13 is now explicitly guarded by Mode A + task-first rule.
- Temporary docs can still ossify without cleanup cadence.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs/_svc_v91.md](docs/_svc_v91.md#L213)
- [docs/task](docs/task)
- [docs/plan](docs/plan)

### S13 Reading Strategy

Status: Aligned

Findings:

- Selective read approach remains in place and is compatible with v9.1.

Evidence:

- [AGENTS.md](AGENTS.md)

### S14 Migration Guidance (V8/V9 -> V9.1)

Status: Aligned

Findings:

- Completed: restatement protocol has been added.
- Completed: dynamic protocol (Mode A/B/C) and explicit Task-First execution behavior are now added.

Evidence:

- [AGENTS.md](AGENTS.md)
- [docs/_svc_v91.md](docs/_svc_v91.md#L224)

### S15 Overall Summary

Status: Partial (good baseline, remaining gaps are guardrail and promotion discipline)

Overall judgment:

- The repository is structurally close to v9.1.
- Dynamic execution behavior is now aligned; remaining drift is mainly promotion governance and guardrail posture.

Top 5 drifts by priority:

1. Temporary-doc entropy risk remains without cleanup cadence.
2. Alignment-pack admission/exit criteria are not yet codified in repo guidance.
3. Frontend rollout truth is still less canonical than backend rollout truth.
4. SVC v9.1 focused drift re-check should be rerun after cleanup-policy updates.
5. No additional high-severity durable-layer drift detected in this pass.

## Recommended Remediation Backlog (v9.1)

### P0

1. Replace the test-deprioritization statement in [AGENTS.md](AGENTS.md) with guardrail-first wording aligned to principle 1.2.
2. Rerun drift scoring after AGENTS updates to confirm section statuses.

### P1

1. Define periodic cleanup cadence for [docs/task](docs/task) and [docs/plan](docs/plan).
2. Decide and document alignment-pack admission/exit criteria (when to create, expand, or demote).

### P2

1. Tighten frontend deployment canon so ESA rollout procedure is as explicit as backend FC rollout.
2. Re-run a focused drift check after P0/P1 changes.

## Confidence And Limitations

Confidence: High on layer-ownership and AGENTS protocol gaps; Medium on whether alignment pack is immediately necessary.

Limitations:

- This update intentionally did not read task/plan content bodies per repository rules, so recurrence judgments are based on durable docs and repository-level signals.
