# Task Packet - Issue 157 Other Events Exposure

## MVT Core

- Objective & Hypothesis: Complete issue #157 by exposing "look at other events" entry points from Anchor Event and Anchor PR detail surfaces, while reusing the same event-card horizontal list language already established on home. Hypothesis: the existing `GET /api/events` catalog plus a domain-owned reusable horizontal list is sufficient, with no backend or contract changes.
- Guardrails Touched:
  - docs/10-prd behavior around event-anchored collaboration entry and re-discovery
  - docs/20-product-tdd contract that `GET /api/events` remains the backend-authoritative event catalog for event-card selection surfaces
  - frontend reuse-first rule for cross-page event discovery UI
  - frontend invariant that Event ordering is opaque display policy rather than frontend-owned ranking truth
- Verification:
  - pnpm --filter @partner-up-dev/frontend build

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - include PRD wording for cross-event rediscovery from Anchor Event / Anchor PR
  - include a reusable event-domain horizontal list surface
  - include Anchor Event list/card mode placements and Anchor PR text-link placement
  - include locale/schema updates needed by the new UI copy
- Excluded for this issue:
  - backend API or ordering-policy changes
  - new ranking, recommendation, or personalization logic
  - analytics expansion beyond existing click handling unless naturally needed by the reused UI
