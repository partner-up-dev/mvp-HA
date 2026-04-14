# Task Packet - PageHeader Back Fallback

## MVT Core

- Objective & Hypothesis: Diagnose and fix the no-op back behavior on Anchor Event, Anchor PR, and Event Plaza headers. Hypothesis: the shared header incorrectly treats browser history length as router back availability, causing `router.back()` to no-op and skip configured fallback targets.
- Guardrails Touched:
  - Frontend shared navigation primitive: `src/shared/ui/navigation/PageHeader.vue`.
  - Route-level fallback contracts in Anchor Event / Anchor PR / Event Plaza pages must remain unchanged.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Reality.
- Active Mode: Diagnose -> Execute.
- Scope Decision:
  - Keep route/page fallback configuration as-is.
  - Fix only shared back decision logic in `PageHeader`.
  - Prefer Vue Router history state (`window.history.state.back`) over raw browser history length.

## Outcome

- Replaced `window.history.length > 1` with Vue Router back-entry detection using `window.history.state.back`.
- Preserved existing priority order:
  - explicit `@back` listener on caller
  - router back when there is a router-managed previous entry
  - fallback route (`backFallbackTo` or `/`)
- This ensures deep-link/open-direct scenarios no longer falsely enter a back no-op path.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
