# Product TDD Index

## Role In The System

`docs/20-product-tdd/` is the canonical system-level technical realization layer.

It explains how the product behavior defined in PRD is realized across technical units, boundaries, contracts, and runtime-shaping constraints.
Technical units are not the same thing as code containers; this layer makes that mapping explicit.

## What This Layer Owns

- technical units
- authority boundaries
- unit-to-container mapping
- cross-unit coordination
- cross-unit contracts
- system-level failure and recovery semantics
- deployment-shaping constraints

## What Must Not Appear Here

- repo-global ontology or promotion rules
- product claims stated without technical realization context
- unit-local implementation detail that does not affect cross-unit design
- step-by-step rollout procedures better owned by deployment docs

## How To Read This Layer

Recommended order:

1. `system-objective.md`
2. `unit-topology.md`
3. `unit-boundary-rules.md`
4. `coordination-model.md`
5. `cross-unit-contracts.md`
6. `system-state-and-authority.md`
7. `claim-realization-matrix.md`

Use `deployment-shaping-constraints.md` when operational reality affects system design.

## How This Layer Connects To Adjacent Layers

- Upstream from PRD: this layer must realize PRD claims, workflows, and rules without redefining them.
- Downstream to Unit TDD: units inherit boundaries and contracts from here instead of inventing them locally.
- Sideways to deployment docs: this layer captures only the runtime facts that shape design, not the full runbook.

## Common Local Mistakes

- treating workspace folders as architecture without defining authority
- pushing backend/frontend contract decisions down into unit docs
- mixing deployment procedures into system design
- documenting implementation facts without explaining why the decomposition exists
