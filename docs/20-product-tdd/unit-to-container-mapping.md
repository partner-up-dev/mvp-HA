# Unit To Container Mapping

## Repo Container

The repo root is a monorepo code container that holds both product units and shared delivery assets.

It is not itself a technical unit.

## Mapping

- Backend unit -> `apps/backend`
- Frontend unit -> `apps/frontend`

## Shared Build Coupling

The frontend depends on the backend workspace package at compile time:

- imports `AppType` for Hono RPC typing
- imports exported backend types such as `PRId`, `PartnerRequestFields`, and summary/detail-related types

This is a type-level coupling inside one monorepo, not a collapse of runtime boundaries.

Runtime interaction still occurs over HTTP.

## Supporting Containers

- `scripts/` and `.github/` support build/deploy workflows for both units
- `docs/` documents both units and their contracts
- `node_modules/` is workspace infrastructure, not a unit boundary
