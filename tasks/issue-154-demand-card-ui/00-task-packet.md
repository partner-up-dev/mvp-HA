# Task Packet - Issue 154 Demand Card UI

## MVT Core

- Objective & Hypothesis: Implement the first pass of issue #154 demand-card readability improvements without changing card swipe business semantics. Hypothesis: moving location to the cover badge, de-emphasizing time styling, removing stamp overlays, and adding a delayed swipe hint toast will improve card-mode landing clarity.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`

## Scope For This Pass

- Included:
  - cover badge text changed from time to location
  - demand-card body keeps only time as primary text row and downgrades its visual emphasis
  - removed swipe stamp overlays
  - show centered toast hint (`左右滑动试试`) only when no interaction happens in 3 seconds
- Deferred:
  - left/right glow gesture feedback (explicitly postponed)

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Existing baseline debt remains in token lint across unrelated files; this change removed newly introduced local `color-mix` findings and left the pre-existing lint set at 40 findings outside baseline.

## Follow-up Slice: Page Maintainability

- Objective: split the oversized `AnchorEventPage` card/list branches into dedicated mode sections before further visual tuning.
- Implemented:
  - added `AnchorEventCardModeSection.vue` for card mode rendering and interactions
  - added `AnchorEventListModeSection.vue` for list mode rendering and interactions
  - rewired `AnchorEventPage.vue` to assemble the two sections and keep page-level state/effects only
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
