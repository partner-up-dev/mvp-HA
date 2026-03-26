# Doc System

## Purpose

This file defines the current documentation layout, read order, and migration state for this repository.

## Current Canonical Layers

- `docs/00-meta/*`: canonical documentation-system rules and ontology
- `docs/10-prd/*`: canonical product intent and behavior
- `docs/20-product-tdd/*`: canonical system-level technical realization
- `docs/30-unit-tdd/*`: canonical unit-local technical realization
- `apps/backend/AGENTS.md` and `apps/frontend/AGENTS.md`: package-local technical guidance
- `docs/deployment/*`: current runtime/deployment truth until the deployment layer is migrated

## Transitional Areas

- `docs/product/*`: legacy product documentation being migrated into `docs/10-prd/*`
- `docs/task/*`: transient task packets and execution tracking
- `docs/plan/*`: historical planning material, not a durable layer

## Read Order

Default reading order:

1. nearest relevant `AGENTS.md`
2. `docs/00-meta/doc-system.md`
3. other relevant files under `docs/00-meta/*`
4. `docs/10-prd/index.md`
5. the specific PRD document that governs the change
6. relevant `docs/20-product-tdd/*`
7. relevant `docs/30-unit-tdd/<unit>/*`
8. relevant package-local technical guidance
9. active task packet under `docs/task/*`
10. code and tests

## Layer Ownership

### `docs/00-meta`

Owns:

- ontology for the documentation system
- intake protocol
- promotion policy
- repo-wide read logic

Must not contain:

- product-specific workflows
- technical-unit decomposition
- deployment runbooks

### `docs/10-prd`

Owns:

- product drivers
- claims
- workflows
- user-visible rules and invariants
- derived domain vocabulary and lifecycle
- scope boundaries

Must not contain:

- module layout
- package decomposition policy
- API transport internals unless they are user-visible contracts
- rollout or operational procedures

### `docs/deployment`

Owns, for now:

- current deployment workflow
- current runtime procedures and constraints that are not yet migrated

Must not silently become product or architecture documentation.

### `docs/task`

Owns:

- task-local planning
- negotiation
- implementation sequencing
- evidence
- promotion candidates

Must not be treated as a stable source of truth by default.

## Migration State

The repository is in a phased migration.

Current migration target:

- establish `docs/00-meta/*`
- establish `docs/10-prd/*`
- establish `docs/20-product-tdd/*`
- establish `docs/30-unit-tdd/*`
- keep runtime/deployment truth in `docs/deployment/*` until the deployment phase

Practical rule:

- if a durable product statement has already been migrated into `docs/10-prd/*`, update that file
- if a durable technical statement has a home in `docs/20-product-tdd/*` or `docs/30-unit-tdd/*`, update that file instead of burying it in package-local notes
- if a durable statement has not yet been migrated, update the active task packet first, then promote it into the right durable layer rather than extending legacy docs
