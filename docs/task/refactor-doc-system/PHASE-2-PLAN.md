# PHASE 2 PLAN - Product TDD And Unit TDD

## Goal

Extend the new durable doc system from product intent into technical realization without attempting the deployment-layer rewrite yet.

## Scope

- create `docs/20-product-tdd/*`
- create `docs/30-unit-tdd/*`
- define backend/frontend as the current technical units
- document system authority boundaries, typed contracts, and runtime-shaping constraints
- document local design and operation rules for backend and frontend units

## Source Material

- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- `apps/frontend/src/ARCHITECTURE.md`
- backend/frontend package manifests and main entrypoints
- backend route mount graph and frontend RPC clients
- legacy backend deployment docs and workflow files for deployment-shaping constraints only

## Acceptance Criteria

- a new engineer can identify the current technical units and their authority boundaries without inferring them from folder names alone
- frontend/backend compile-time and runtime coordination is explicit
- backend and frontend unit docs explain local design, interfaces, state, operations, and verification
- deployment procedures remain in the deployment layer, but system-shaping deployment constraints are captured in Product TDD

## Out Of Scope

- full deployment-layer migration in the same patch
- historical cleanup of `docs/product/*`, `docs/plan/*`, or old package-local notes
- code changes beyond documentation and read-order updates
