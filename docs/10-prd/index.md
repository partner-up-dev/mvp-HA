# PRD Index

## Role In The System

`docs/10-prd/` is the canonical product-intent layer for PartnerUp MVP-HA.

This layer defines:

- what product pressures we are responding to
- what durable user-visible behavior must hold
- what rules and scope boundaries future implementation must honor
- what derived domain structure helps keep the product intelligible

## What This Layer Owns

- product drivers
- product claims
- product capabilities
- workflows
- user-visible rules and invariants
- scope boundaries
- derived domain vocabulary and lifecycle

## What Must Not Appear Here

- workspace/package decomposition
- module ownership layout
- internal controller/service/repository structure
- rollout procedures and deployment runbooks
- task-local implementation sequencing

## How To Read This Layer

Recommended order:

1. `_drivers/*` for upstream pressure
2. `behavior/claims.md`
3. `behavior/workflows.md`
4. `behavior/rules-and-invariants.md`
5. `behavior/scope.md`
6. `domain-structure/*`

Use `capabilities.md` as the product surface map, not as the primary source of truth.

## How This Layer Connects To Adjacent Layers

- Upstream from `docs/00-meta/*`: this layer inherits ontology and promotion rules.
- Downstream to future Product TDD: technical decomposition must realize the claims, workflows, and rules defined here.
- Sideways to `docs/40-deployment/*`: runtime realities may constrain the product, but runtime procedures do not belong here.

## Common Local Mistakes

- starting from architecture instead of product pressure
- treating page structure as the same thing as product capability
- mixing current implementation detail into durable product rules
- letting derived domain vocabulary silently redefine product drivers or claims
