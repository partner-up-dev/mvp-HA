# Task Packet - Anchor Event List Date Aggregation

## MVT Core

- Objective & Hypothesis: change Anchor Event Page list mode so tabs aggregate batches by product-local date instead of per batch start datetime. Hypothesis: the existing event-detail payload already contains enough batch time-window data to group tabs locally on the frontend while preserving batch-scoped PR browsing and create flow inside the selected date panel.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` Anchor Event browsing and controlled create flow
  - frontend event-domain ownership for Anchor Event list-mode behavior
  - batch-scoped create semantics must remain intact even when the list tab groups by date
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
