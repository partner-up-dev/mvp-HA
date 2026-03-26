# Phase 1 Migration Map

## Purpose

This file tracks how the legacy product docs map into the new canonical Phase 1 layers.

## Canonical Targets Introduced In This Phase

- `docs/00-meta/*`
- `docs/10-prd/*`

## Legacy To New Mapping

### `docs/product/overview.md`

- product positioning -> `docs/10-prd/_drivers/market-and-user-pressures.md`
- product objective and validation framing -> `docs/10-prd/_drivers/business-and-service-objectives.md`
- core shape and legal usage paths -> `docs/10-prd/behavior/capabilities.md`
- main user flows -> `docs/10-prd/behavior/workflows.md`
- durable behavior rules -> `docs/10-prd/behavior/rules-and-invariants.md`

### `docs/product/glossary.md`

- documentation-system vocabulary does not migrate from here; it now lives in `docs/00-meta/concepts.md`
- product vocabulary and lifecycle -> `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`

### `docs/product/features/find-partner.md`

- creation and participation flows -> `docs/10-prd/behavior/workflows.md`
- capability surface -> `docs/10-prd/behavior/capabilities.md`
- durable product rules -> `docs/10-prd/behavior/rules-and-invariants.md`
- product boundaries -> `docs/10-prd/behavior/scope.md`

### `docs/product/features/user-signin-signup.md`

- identity capability -> `docs/10-prd/behavior/capabilities.md`
- identity workflow -> `docs/10-prd/behavior/workflows.md`
- durable identity rules -> `docs/10-prd/behavior/rules-and-invariants.md`
- identity vocabulary -> `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`

### `docs/product/features/wechat-login.md`

- hard constraints and operational reality -> `docs/10-prd/_drivers/hard-constraints.md`, `docs/10-prd/_drivers/operational-realities.md`
- identity rules -> `docs/10-prd/behavior/rules-and-invariants.md`
- cross-domain interaction with participation -> `docs/10-prd/domain-structure/cross-domain-interactions.md`

### `docs/product/features/share-link.md`

- sharing capability -> `docs/10-prd/behavior/capabilities.md`
- sharing workflow -> `docs/10-prd/behavior/workflows.md`
- attribution rule -> `docs/10-prd/behavior/rules-and-invariants.md`

### `docs/product/features/share-to-wechat.md`

- hard constraints and operational reality -> `docs/10-prd/_drivers/hard-constraints.md`, `docs/10-prd/_drivers/operational-realities.md`
- sharing capability and workflow -> `docs/10-prd/behavior/capabilities.md`, `docs/10-prd/behavior/workflows.md`

### `docs/product/features/share-to-xhs.md`

- sharing capability and workflow -> `docs/10-prd/behavior/capabilities.md`, `docs/10-prd/behavior/workflows.md`
- scope boundary for non-direct publishing -> `docs/10-prd/behavior/scope.md`

### `docs/product/features/contact-author.md`

- support/operations capability -> `docs/10-prd/behavior/capabilities.md`
- support workflow -> `docs/10-prd/behavior/workflows.md`
- support domain boundary -> `docs/10-prd/domain-structure/derived-boundaries.md`

### `docs/product/features/expire-partner-request.md`

- durable lifecycle rule -> `docs/10-prd/behavior/rules-and-invariants.md`
- product vocabulary/lifecycle -> `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`
- detailed lazy-refresh mechanics are implementation-facing and should be carried later by technical docs, not expanded further in PRD

### `docs/product/features/wecom-message.md`

- current in-scope capability -> `docs/10-prd/behavior/capabilities.md`
- workflow -> `docs/10-prd/behavior/workflows.md`
- operational reality about time semantics -> `docs/10-prd/_drivers/operational-realities.md`

## Legacy Status

- PRD cutover is complete enough that new durable product updates should target `docs/10-prd/*` only.
- `docs/product/*` can be removed as legacy durable docs after this migration step.
