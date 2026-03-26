# Backend Verification

## Required Checks

- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/backend typecheck` when touching backend TS contracts
- `pnpm db:lint` when touching migrations or DB workflow

## Contract Checks

- controller validation remains Zod-backed
- public route changes keep `AppType` and exported types coherent for the frontend workspace
- auth and error payload changes are reviewed as cross-unit contract changes

## Behavioral Checks

- verify domain actions still emit required side effects where expected
- verify request-tail and job/outbox behavior remain compatible with scale-to-zero constraints
