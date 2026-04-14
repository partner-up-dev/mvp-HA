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

## Follow-up Slice: Edge Projection And Negative-Space Prompts

- Objective & Hypothesis: Replace the half-way card-stage glow with directional prompts plus top-layer edge projection that reads as ambient light on the moving card surface. Hypothesis: stage-owned prompt and projection layers, driven by shared swipe preview phase, will feel clearer and stay synchronized during drag, rebound, and exit.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `apps/frontend/src/domains/event/ui/demand-card-swipe-feedback.ts`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint currently reports 42 findings outside baseline, all in pre-existing unrelated files; no touched file from this slice remains in the lint output.

## Follow-up Slice: Edge-Anchored Point Light

- Objective & Hypothesis: Refine edge glow from a fixed vertical side wash into a point-light source sampled from the initial drag touch Y, then keep that source anchored at the screen edge while intensity and spread evolve non-linearly with swipe progress. Hypothesis: freezing the source height at drag start will feel more stable and intentional than chasing finger Y on every frame, while still preserving direct-manipulation cues.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/demand-card-swipe-feedback.ts`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - browser inspection on local `/events/2` card mode
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint remains at the same 42 unrelated baseline findings
  - Browser inspection confirmed the projection center aligns with the sampled anchor Y when `cardSwipePreviewState.anchorViewportY` is set

## Follow-up Slice: Corner-Anchored Elliptical Edge Glow

- Objective & Hypothesis: Replace the continuous Y-tracking point light with four fixed corner slots (`left-top`, `right-top`, `left-bottom`, `right-bottom`) and move plain-text prompts onto the glow layer without badge chrome. Hypothesis: deciding the vertical slot once on `pointerdown`, then projecting a larger elliptical glow half-hidden beyond the screen edge, will feel cleaner and more legible than continuously recomputing projection height.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/demand-card-swipe-feedback.ts`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
- Implemented:
  - preview state now persists `anchorCorner` (`top` / `bottom`) so drag, rebound, and exit reuse the same corner slot instead of re-deriving from live stage geometry
  - `AnchorEventDemandCard` samples `anchorCorner` once on `pointerdown` and keeps it frame-synced through preview phase transitions
  - projection shell now renders a larger elliptical light source with more diffuse bloom/spill and keeps the source center further beyond the viewport edge
  - prompt text is rendered as plain text above the glow, outside the light element's `mix-blend-mode`, so it does not get washed out with the projection
  - fixed a visibility bug where prompt text existed but was pushed outside the viewport by the projection shell offset
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - browser verification on local `http://127.0.0.1:4173/events/2?mode=card`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint remains at the same 42 unrelated baseline findings
  - Browser verification confirmed:
    - top-right state shows visible `加入` text with green edge glow
    - bottom-left state shows visible `跳过` text with red edge glow
    - prompt visibility bug root cause was projection-shell horizontal offset placing text outside the viewport
  - Note: direct drag simulation via `agent-browser` mouse actions did not reliably trigger the card's pointer-capture interaction in this environment, so visual verification used browser-side state injection on `cardSwipePreviewState` after confirming the live page component tree

## Follow-up Slice: Glow Under Card Experiment

- Objective & Hypothesis: Try moving only the edge-glow layer beneath the active card while keeping the corner-slot logic and prompt text placement intact. Hypothesis: keeping glow below the card shell will reduce cover-image washout and make the feedback read more like ambient edge bleed than a projection cast onto the card face.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
- Implemented:
  - split the previous projection layer into an under-card glow underlay and a label-only overlay
  - kept prompt text above the card for legibility, while moving only the glow beneath the card stack
  - preserved `pointer-events: none` on both auxiliary layers
  - decoupled prompt positioning from the glow shell so bottom-corner glow states also keep their prompt copy at the card's top outer edge instead of overlapping the card face
  - lifted the top-outer prompt rail by another ~20px to avoid grazing the card's top edge
  - switched prompt and glow activation/spread response to an ease-out curve so feedback ramps up faster early and slows as it approaches the threshold
  - replaced the absolute-positioned prompt overlay with a dedicated `label rail` row in normal document flow, while moving the glow underlay inside the card-area container; this makes prompt/card separation come from CSS layout rather than paint-time offsets
  - rebalanced the card deck insets from symmetric vertical padding to asymmetric `top 2% / bottom 10%`, so the reserved top rail does not make the card feel visibly sunk
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - browser verification on local `http://127.0.0.1:4173/events/2?mode=card`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint remains at the same 42 unrelated baseline findings
  - Browser verification confirmed the glow no longer washes across the card face; it now reads mainly as edge/background bleed while the prompt text remains visible above the card
  - Browser verification also confirmed bottom-corner prompt text now stays at the card-top outer rail rather than drifting down with the lower glow slot
  - Browser verification confirmed the raised top rail leaves clearer separation from the card edge, and the new easing makes prompt/glow presence appear earlier in the swipe
  - Cross-height gap measurements after the `label rail` refactor:
    - `390x844`: prompt bottom -> card top gap `49.36px`
    - `375x667`: prompt bottom -> card top gap `38.73px`
    - `320x568`: prompt bottom -> card top gap `29.92px`
  - Assessment:
    - the previous absolute-positioned prompt overlay could still overlap on shorter heights because it shared the same paint plane as the card and relied on visual offsets only
    - the current `label rail + card area` grid structure removes that class of overlap by reserving prompt space through normal flow before the card row is laid out
  - After the inset rebalance, the card position moved back upward while preserving positive rail clearance:
    - `375x667`: gap `22.61px`, `cardTop 196.05px`
    - `320x568`: gap `19.67px`, `cardTop 241.11px`
    - compared with the prior `320x568` measurement, `cardTop` moved upward by about `10.25px`
  - After tightening the label rail to roughly 60% of the prior spacing:
    - `375x667`: gap `14.78px`
    - `320x568`: gap `11.83px`
    - both remain positive, so the rail/card separation still holds structurally without overlap

## Follow-up Slice: Card Breathing Room And Android WeChat WebView Diagnosis

- Objective & Hypothesis: Make the active demand card read slimmer in card mode, lift the bottom-corner glow so lower drag starts still light the card's upper edge, and inspect Android WeChat WebView jank without committing to a risky motion rewrite yet. Hypothesis: reclaiming about `20px` of total card width through stage-side breathing room will improve negative space more cleanly than shrinking inner card content, while Android jank is more likely caused by per-frame reactive round-trips plus expensive glow compositing than by the drag transform alone.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `tasks/issue-154-demand-card-ui/00-task-packet.md`
- Implemented:
  - added `--card-mode-inline-breathing-room: 10px` so the card stage, action row, and inline error all align to a slightly narrower card footprint
  - kept the change structural at the stage shell level instead of shrinking card content blocks, so cover, chips, and notes layout stay unchanged
  - raised the bottom-corner glow shell slot from `77%` to `71%` so lower drag starts project light higher onto the card stack
- Diagnosis Notes:
  - the current swipe-preview pipeline performs a cross-component reactive round-trip on every `pointermove`: card emit -> section relay -> page state write -> section computed style rebuild
  - the glow underlay remains expensive on weaker Android GPU / WebView combinations because it stacks `mix-blend-mode: screen`, multiple `filter: blur(...)` layers, gradients, and opacity / transform animation
  - the active card also drags with large-surface `box-shadow`, while the location badge uses `backdrop-filter`, increasing composite cost during horizontal drag
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint remains at the same 42 unrelated baseline findings outside the accepted baseline
  - Android WeChat WebView optimization is intentionally left at diagnosis / proposal stage pending product confirmation on the preferred trade-off

## Follow-up Slice: Local Swipe Preview And RAF Drag Batching

- Objective & Hypothesis: Try optimization path A without materially downgrading the glow / badge presentation, because card mode is a core landing surface. Hypothesis: moving swipe-preview ownership out of the page and batching drag work behind `requestAnimationFrame` will reduce Android WeChat WebView jank while preserving the current aha moment.
- Guardrails Touched:
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
- Implemented:
  - removed the page-level swipe preview round-trip so `AnchorEventPage` no longer stores per-frame drag preview state
  - made `AnchorEventCardModeSection` own the glow prompt / projection preview state locally and only notify the page once to consume the delayed drag-hint window
  - changed active-card drag updates in `AnchorEventDemandCard` from every `pointermove` mutation to `requestAnimationFrame` batching
  - switched the drag transform to `translate3d(...)` and added `will-change: transform` on the active card shell to make compositor promotion more explicit
  - kept glow, prompt, badge, and preview-stack visuals intact instead of adding any Android-specific visible downgrade in this pass
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Token lint remains at the same 42 unrelated baseline findings outside the accepted baseline
  - Remaining risk: without Android WeChat WebView traces, this is still a best-first optimization pass rather than a proven root-cause fix

## Follow-up Slice: Card Detail Affordance And Reset Semantics

- Objective & Hypothesis: Align Anchor Event card mode with the updated browsing expectation that each Demand Card is a direct detail entry, while keeping list-mode batch context intact. Hypothesis: separating card-only time text from list/batch labels, treating a tap on the active card as the same intent as a right-swipe, resetting processed cards when the user returns to card mode after exhausting the stack, and clamping notes to three lines will make card-mode browsing clearer without widening the mutation surface.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
  - `tasks/issue-154-demand-card-ui/00-task-packet.md`
- Planned Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Verified in code that card-mode time text now excludes batch description, the active card tap path resolves to the same `view-detail` exit action as right swipe, and card-mode reset applies through both UI toggle and query-driven mode re-entry via shared `applyViewMode(...)`
  - Notes rendering is now clamped to three lines with ellipsis behavior via `-webkit-line-clamp: 3`
