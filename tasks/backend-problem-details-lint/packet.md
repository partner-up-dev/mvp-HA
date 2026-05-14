# Backend Problem Details Lint

## Objective & Hypothesis

Add a backend-wide lint mechanism that prevents production code from throwing raw Hono `HTTPException` for expected API errors. API errors should go through Problem Details helpers so response shape and typed codes stay centralized.

## Guardrails Touched

- Backend global error contract
- Backend lint workflow
- Domain/controller error expression
- Durable backend operating guidance

## Verification

- 2026-05-14: `pnpm --filter @partner-up-dev/backend lint:problem-details` passed.
- 2026-05-14: `pnpm lint:backend` passed.
- 2026-05-14: `pnpm --filter @partner-up-dev/backend typecheck` passed.
- 2026-05-14: `pnpm test:backend:unit` passed.
- 2026-05-14: `pnpm test:scenario backend` passed.
- 2026-05-14: `pnpm --filter @partner-up-dev/backend build` passed.
