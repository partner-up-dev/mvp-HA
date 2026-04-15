# Task Packet - Anchor Event List Auto Expand Create Card

## MVT Core

- Objective & Hypothesis: improve Anchor Event Page list mode so the batch-scoped `create-pr-card` auto-expands when the currently selected batch has no available Anchor PR candidates. Hypothesis: the existing event-detail payload plus a local list-mode expansion default keyed by selected batch is sufficient, with no backend contract change.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` rule that users may create through the controlled event-page flow when the current batch or location has no suitable Anchor PR
  - frontend event-domain ownership for Anchor Event list-mode behavior
  - shared primitive stability: keep `ExpandableCard` generic and avoid widening its API for a page-local behavior
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - keep the change inside Anchor Event list-mode components
  - treat available Anchor PRs as the joinable statuses already used elsewhere in frontend/backend flow (`OPEN` / `READY`)
  - reset the create-card initial expansion when the user switches batches
- Excluded for this issue:
  - backend filtering or serialization changes
  - list-mode PR visibility or ordering changes
  - global `ExpandableCard` controlled-state behavior
