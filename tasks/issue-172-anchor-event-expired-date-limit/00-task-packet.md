# Task Packet - Issue 172 Anchor Event Expired Date Limit

## MVT Core

- Objective & Hypothesis: Adjust Anchor Event Page list mode so past product-local dates are treated as expired on the frontend, only the latest three expired dates with at least one normally closed PR remain visible, and expired date panels show only closed rows. Hypothesis: the route-level date aggregation already owns enough frontend state to enforce this without changing backend contracts.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` Anchor Event list-mode browsing behavior
  - `apps/frontend/src/pages/AnchorEventPage.vue` list-mode date aggregation
  - `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue` list-mode row visibility
- Verification:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
