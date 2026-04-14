# Task Packet - Event Catalog Order And Highlight Rail Loop

## MVT Core

- Objective & Hypothesis: make the public active event catalog deterministic again, add optional looped continuous auto-scroll support to the reusable horizontal event rail, and fix the full-bleed highlight rail so it uses the intended non-compact card variant. Hypothesis: a small backend use-case rollback plus a domain-local rail enhancement is enough, while keeping frontend ordering truth opaque and backend-authored.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - backend authority boundary for `GET /api/events` ordering
  - frontend event-domain reuse rule for horizontal event rails
  - frontend invariant that ordering policy is not hardcoded in consumers
- Verification:
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: mixed `Intent` + `Reality`
- Active Mode: Execute
- Scope Decision:
  - remove per-request shuffle from the backend event catalog use-case
  - keep ordering backend-authored and opaque to frontend consumers
  - add opt-in auto-scroll to `AnchorEventHorizontalList` only
  - enable auto-scroll from `EventHighlightsSection` only
  - preserve contained rails as compact/outline unless explicitly overridden
- Excluded for this issue:
  - new ranking, recommendation, or personalization policy
  - changing event-card content structure outside the rail variant fix
  - adding a separate carousel library or new shared UI primitive
