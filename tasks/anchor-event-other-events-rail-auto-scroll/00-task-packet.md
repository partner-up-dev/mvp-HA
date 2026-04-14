# Task Packet - Anchor Event Other Events Rail Auto Scroll

## MVT Core

- Objective & Hypothesis: make `AnchorEventHorizontalList` auto-scroll speed responsive to measured rail geometry instead of a fixed px rate, and enable the same auto-scroll behavior for Anchor Event Page's "其它活动" rails in both card and list modes. Hypothesis: keeping the existing 350px-container feel as the baseline while scaling against the rail viewport and card span will preserve the current pleasant cadence without adding page-specific motion logic.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/composites/AnchorEventHorizontalList.vue`
  - `apps/frontend/src/domains/event/ui/sections/OtherAnchorEventsSection.vue`
  - frontend event-domain reuse rule for horizontal event rails
  - Anchor Event Page invariant that card/list mode reuse the same other-events section instead of forking motion logic in page scope
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - keep the auto-scroll behavior owned by the reusable event rail instead of hardcoding separate page-level speeds
  - use measured rail geometry to derive the runtime speed while preserving the current 350px-container cadence as the reference point
  - enable auto-scroll from `OtherAnchorEventsSection` so card and list modes inherit the same behavior through existing composition
