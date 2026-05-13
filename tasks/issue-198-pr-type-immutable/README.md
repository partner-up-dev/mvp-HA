# Issue 198 - PR Type Immutable

## Objective & Hypothesis

Prevent ordinary user PR content edits from changing `PR.type`. `PR.type` is the input used to resolve Anchor Event context, so accepting it in user edit payloads can make context reads drift from creation-time materialized PR runtime state.

## Guardrails Touched

- Backend PR user content update route and use-case.
- Admin PR content update remains the operator-owned reclassification path.
- Frontend ordinary edit form omits `type` from submitted payload.
- Cross-unit contract documents user edit payload ownership.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm test:scenario backend` was rerun after the focused PR scenarios passed in the earlier run; the later full rerun timed out at 184s before returning a final TAP summary.
