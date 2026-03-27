# Migration Map - SVC v8 Alignment

## Purpose

Map the current durable documentation set to its intended V8 destination so the remediation work can delete or merge documents deliberately instead of growing another transitional layer.

## Keep

### Keep as PRD

- `docs/10-prd/index.md`
- `docs/10-prd/_drivers/*`
- `docs/10-prd/behavior/*`
- `docs/10-prd/domain-structure/*`

Condition:

- trim or rewrite when content drifts into implementation structure

### Keep as Product TDD core

- `docs/20-product-tdd/index.md`
- `docs/20-product-tdd/unit-topology.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/claim-realization-matrix.md`

Condition:

- absorb any surviving high-value content from the extra Product TDD files below

### Keep as Deployment

- `docs/40-deployment/index.md`
- `docs/40-deployment/environments.md`
- `docs/40-deployment/rollout.md`
- `docs/40-deployment/observability.md`
- `docs/40-deployment/recovery.md`

Condition:

- keep this layer operational; do not let it become backend pseudo-architecture

### Keep as optional layer shell

- `docs/30-unit-tdd/index.md`

Condition:

- this file should explain that Unit TDD is optional and currently empty unless a hard unit is justified

## Merge into surviving docs

### Into root `AGENTS.md`

- `docs/00-meta/concepts.md`
- `docs/00-meta/intake-protocol.md`
- `docs/00-meta/promotion-rules.md`
- `docs/00-meta/doc-system.md`

Reason:

- repo-level navigation and owner rules should live in the local operating guide, not in a permanent meta sub-system

### Into `docs/20-product-tdd/index.md`

- `docs/20-product-tdd/system-objective.md`

### Into `docs/20-product-tdd/unit-topology.md`

- `docs/20-product-tdd/unit-to-container-mapping.md`
- `docs/20-product-tdd/deployment-shaping-constraints.md`

### Into `docs/20-product-tdd/system-state-and-authority.md`

- `docs/20-product-tdd/unit-boundary-rules.md`

### Into `docs/20-product-tdd/cross-unit-contracts.md`

- `docs/20-product-tdd/coordination-model.md`
- `docs/20-product-tdd/failure-and-recovery-model.md`

## Delete after merge

### Remove V7 meta layer

- `docs/00-meta/*`

### Remove extra Product TDD files

- `docs/20-product-tdd/system-objective.md`
- `docs/20-product-tdd/unit-boundary-rules.md`
- `docs/20-product-tdd/unit-to-container-mapping.md`
- `docs/20-product-tdd/coordination-model.md`
- `docs/20-product-tdd/failure-and-recovery-model.md`
- `docs/20-product-tdd/deployment-shaping-constraints.md`

### Remove broad package-level Unit TDD docs

- `docs/30-unit-tdd/backend/*`
- `docs/30-unit-tdd/frontend/*`

Reason:

- these folders are broad package manuals, not narrow hard-unit memory documents

## Update during this migration

- `AGENTS.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/10-prd/behavior/scope.md`
- `docs/10-prd/behavior/capabilities.md`
- `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`
- `docs/10-prd/_drivers/hard-constraints.md`
- `docs/20-product-tdd/*` surviving core files
- `docs/40-deployment/index.md`

## Leave as historical task evidence

- `docs/task/*`
- `docs/plan/*`
- task packets that still mention `docs/00-meta/*` or broad Unit TDD files

Reason:

- those references are execution history, not durable navigation
