# Concepts

## Purpose

This file defines the canonical documentation-system vocabulary for this repository.

It is intentionally repo-generic. Product-specific terms such as `PartnerRequest`, `Community PR`, and `Anchor PR` belong in PRD domain-structure documents, not here.

## Core Terms

- Product: the user-visible service reality we are trying to make true.
- Product driver: a durable pressure shaping product truth, such as user need, business objective, platform constraint, or operational reality.
- Product claim: a durable promise about product behavior or value in user-observable terms.
- Capability: something the product can do.
- Workflow: an ordered user-visible path across actors, states, and system steps.
- Rule: a durable behavioral condition the product must respect.
- Invariant: a rule that should remain true across flows and changes unless explicitly redefined.
- Domain: a relatively stable meaning boundary derived from product behavior, vocabulary, and lifecycle.

## Technical Terms

- Technical unit: a coherent technical responsibility boundary that owns implementation or coordination.
- Code container: the physical storage boundary for code or docs, such as the repo root, a workspace package, or a folder.
- Contract: a normative statement stable enough to guide implementation and verification.
- Guardrail: a mechanism that enforces or checks a contract.

## Workflow Terms

- Perturbation: any incoming signal that may force the system to evolve, such as a request, bug report, runtime issue, or artifact.
- Intake: the act of classifying and containing a perturbation before broad changes are made.
- Task packet: the temporary working record for one perturbation. In this repo, task packets currently live under `docs/task/<task-slug>/`.
- Promotion: moving stable truth from transient task context into durable documentation or code-adjacent guardrails.

## Layer Terms

- Meta: global documentation-system rules and ontology. In this repo, this is `docs/00-meta/`.
- PRD: product intent and behavior. In this repo, this is `docs/10-prd/`.
- Product TDD: system-level technical realization. In this repo, this is `docs/20-product-tdd/`.
- Unit TDD: unit-local technical realization. In this repo, this is `docs/30-unit-tdd/`.
- Deployment: runtime truth, rollout, and recovery. During the current migration state, runtime truth remains in `docs/deployment/`.

## Non-Equivalences

- Product is not the same as software implementation.
- Technical unit is not automatically the same as a workspace package.
- Code container is not automatically architecture.
- Task packet is not durable truth.
- PRD is not architecture.
- Meta defines documentation rules; it does not define product behavior.
