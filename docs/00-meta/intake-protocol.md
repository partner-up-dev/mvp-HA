# Intake Protocol

## Purpose

This file defines how new work should enter the system during the current hybrid migration state.

## 1. Capture The Perturbation

Start from the raw input without prematurely promoting it into durable truth.

Typical perturbations:

- feature request
- product clarification
- bug report
- runtime incident
- design or code artifact
- platform or deployment constraint

## 2. Classify The Input

Use one primary type:

- Intent input: asks for new or changed behavior
- Constraint input: imposes limits or non-negotiable conditions
- Reality input: exposes something broken, missing, or unexpectedly true
- Artifact input: provides code, docs, logs, screenshots, or drafts as evidence

## 3. Localize Impact

Before changing durable docs, identify the likely impact zone:

- Meta: ontology, read order, promotion rules, doc-layer boundaries
- PRD: product claims, workflows, rules, domain vocabulary, scope
- Product TDD: system decomposition, authority boundaries, cross-unit contracts
- Unit TDD: local technical design for a technical unit
- Deployment: rollout, observability, recovery, environment truth
- Code only: implementation changes that do not introduce new durable truth

## 4. Contain In A Task Packet

During the current repo state, contain active work under `docs/task/<task-slug>/`.

A task packet should record at least:

- perturbation
- governing anchors
- intended change
- impact hypothesis
- open questions or assumptions
- acceptance criteria
- promotion candidates

Do not rewrite broad durable docs before the task packet explains why.

## 5. Escalate Only When Needed

Escalation is required when the incoming change:

- conflicts with an existing durable rule
- changes user-visible behavior materially
- changes technical-unit boundaries
- changes runtime responsibility or rollout behavior
- has multiple plausible solutions with meaningfully different trade-offs

## 6. Promote Stable Truth Deliberately

Only promote what has become stable enough to guide future work.

Promotion targets:

- `docs/00-meta/*` for repo-global documentation rules
- `docs/10-prd/*` for product truth
- later technical/deployment layers once they are introduced
- code-adjacent guardrails for mechanically checkable invariants

## 7. Current Migration Rule

During the current doc-system refactor:

- `docs/task/` remains the transient working area
- `docs/product/*` is legacy product material
- `docs/10-prd/*` is the target canonical product layer
- do not migrate technical/runtime layers opportunistically while handling a product-doc task
