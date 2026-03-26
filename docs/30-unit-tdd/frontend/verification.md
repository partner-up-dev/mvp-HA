# Frontend Verification

## Required Checks

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm build` when frontend-backend contract changes are involved

## Recommended Checks

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` when touching governed styling output

## Contract Checks

- frontend should keep using Hono RPC clients and backend-exported types
- route-level auth/share behavior changes should be reviewed against backend contracts and PRD flows

## Behavioral Smoke Checks

- session bootstrap still restores expected browser continuity
- Community and Anchor PR pages still read and mutate through the expected route/API families
- WeChat auth-required flows still degrade or redirect coherently
