# Backend Operations

## Local Development

- `pnpm --filter @partner-up-dev/backend dev`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm db:lint`, `pnpm db:migrate`, `pnpm db:reset`, `pnpm db:seed` as appropriate

## Runtime Rules

- no raw `setInterval` as the primary job mechanism
- background execution uses DB-backed jobs plus request-tail and `/internal/jobs/tick`
- deploys assume forward-only migrations

## Deployment-Shaping Notes

- FC custom runtime with custom node_modules layer
- build output bundled by `tsup`
- migration function is separate from the main HTTP function

Detailed rollout/runbook behavior remains in deployment docs.
