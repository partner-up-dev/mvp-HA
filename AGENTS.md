# AGENTS.md of PartnerUp MVP

PartnerUp helps users find their partner (搭子) effectively and safely.
This repository is a pnpm workspace with two product units:

- apps/backend
- apps/frontend

## Source Of Truth Map

- AGENTS.md: local operating rules and execution protocol.
- docs/15-alignment/*: coordination artifacts for reference-sensitive changes.
- docs/10-prd/*: product what/why, claims, workflows, rules, scope, glossary.
- docs/20-product-tdd/*: cross-unit technical truth and contracts.
- docs/30-unit-tdd/*: hard local units only, when needed.
- docs/40-deployment/*: runtime, rollout, and operational truth.
- Code, tests, schemas, and CI own mechanically enforceable truth.

### Read Strategy

Read only what is needed for the change:

1. This file.
2. If reference-sensitive, docs/15-alignment/README.md and ui-map.yaml.
3. Relevant PRD/Product TDD/Deployment docs.
4. Unit TDD only when a named hard-unit doc exists and is relevant.
5. Package operating guides: apps/backend/AGENTS.md, apps/frontend/AGENTS.md.

### Temporary-doc rules

- docs/plan is temporary. Do not read or update it.
- docs/task is temporary task packets. Read/update only the active task folder when the current task explicitly uses it.

### Promotion And Demotion

Promotion test (promote only when most are true):

1. The truth is stable across more than one task.
2. It matters beyond the current implementation step.
3. Rediscovering it later would be risky or expensive.
4. It is not better enforced in code/tests/CI/runtime checks.
5. It has a clear durable owner layer.

Durable destination rules:

- Product what/why, claims, workflows, and domain semantics -> docs/10-prd/*
- Cross-unit technical truth and contracts -> docs/20-product-tdd/*
- Hard local unit complexity truth -> docs/30-unit-tdd/unit-name/*
- Runtime/ops truth -> docs/40-deployment/*
- Mechanically enforceable truth -> code/tests/schemas/CI/runtime guards
- Volatile reasoning, plans, and temporary decisions -> docs/task/*

Demotion rule:

- Simplify, merge, or remove durable docs that no longer answer expensive questions.

## Alignment And Execution Protocol

Alignment pack status:

- docs/15-alignment is enabled in this repo.
- Read docs/15-alignment/README.md and ui-map.yaml for target naming and scope anchors.

Pre-execution restatement protocol (required for risky or ambiguous edits):

1. Target: exact thing being changed.
2. Target path or anchor.
3. Frontend anchor format: page > region > block > element > state.
4. Backend anchor format: bounded_context > service > module > endpoint > behavior.
5. Docs anchor format: document > section > subsection > block.
6. State/context assumptions.
7. Operation type (for example: restyle, reorder, rewrite-copy, extract-component, change-state-transition, refactor).
8. Scope: in-scope and out-of-scope boundaries.
9. Invariants: what must remain unchanged.
10. Likely affected files.
11. Uncertainty needing confirmation.

Execution rule:

- If restatement cannot be completed with confidence, stop and clarify before editing.
- For trivial single-file non-ambiguous edits, concise restatement is acceptable.

Task-first guardrail:

- Do not update PRD/TDD directly from a single vague feature prompt.
- Exploration-first requests stay in docs/task/ until Mode B confirms promotion.

Dynamic execution protocol (v9.1):

- Before editing, assess prompt volatility/ambiguity and select one mode.
- If volatility is unclear, default to Mode A first.

### Mode A: Exploration (high volatility)

Trigger:

- Vague idea, fuzzy requirement, or open-ended problem.

Agent action:

1. Do not modify docs/10-prd/*, docs/20-product-tdd/*, docs/40-deployment/*, or production code.
2. Keep exploration in docs/task/task-name/ only (create or reuse an active task folder).
3. Use Q&A and option exploration to deduce requirements and constraints.

### Mode B: Solidification (from volatility to stable truth)

Trigger:

- Mode A converges, or user provides clear but not-yet-recorded product/technical rules.

Agent action:

1. Classify new truths into PRD vs Product TDD ownership.
2. Run the pre-execution restatement protocol with explicit doc/code impact.
3. Get user confirmation, then update durable docs before coding.

### Mode C: Execution (low volatility)

Trigger:

- Specific localized implementation task or clear bug fix.

Agent action:

1. Read only relevant docs for the target change.
2. Run the pre-execution restatement protocol to lock scope/invariants.
3. After user confirmation, implement tests and code.
4. Ask whether the related task packet can be archived or deleted after completion.

## Development Workflow

- Use GitHub CLI (gh) for GitHub operations and issue template workflows.
- Keep tests and guardrails aligned with behavior changes; do not ship by build-only confidence.

## Coding Guidelines

- No any.
- Prefer async/await over raw Promise chains.
- Enforce data correctness at system boundary.

## Top-Level Glossary

- 搭子请求 (PartnerRequest, PR): model carrying the full lifecycle of partner activities.
- Reference: docs/10-prd/domain-structure/vocabulary-and-lifecycle.md
