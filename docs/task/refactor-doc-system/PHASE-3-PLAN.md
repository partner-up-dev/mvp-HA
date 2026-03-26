# PHASE 3 PLAN - Deployment Layer And Legacy Durable Doc Cleanup

## Goal

Establish `docs/40-deployment/*` as the canonical runtime-truth layer and remove legacy durable docs whose content has already been migrated.

## Scope

- create `docs/40-deployment/index.md`, `environments.md`, `rollout.md`, `observability.md`, and `recovery.md`
- migrate runtime truth out of `docs/deployment/backend-fc-cd.md`
- update active guidance and code comments to reference `docs/40-deployment/*`
- delete legacy durable product docs under `docs/product/*`
- delete legacy durable deployment docs under `docs/deployment/*` after cutover

## Acceptance Criteria

- active canonical docs no longer depend on `docs/product/*` or `docs/deployment/*`
- runtime truth is readable from `docs/40-deployment/*`
- historical task/plan materials may still mention old paths, but active guidance does not
- repo build still passes
