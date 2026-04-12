# Anchor Event Radio Card Carousel Motion

## Objective & Hypothesis

Optimize `AnchorEventRadioCardCarousel` so it behaves like a true carousel-animated single-select card control instead of a scroll-snap list with selected-card emphasis.

Hypothesis: a domain-local refactor that separates selection semantics from spatial animation will produce clearer carousel motion, better accessibility, and more stable behavior inside both the page body and `BottomDrawer`.

## Guardrails Touched

- Frontend domain ownership stays inside `apps/frontend/src/domains/event/ui/*`.
- Maintain existing parent contract: `modelValue` remains the selected event id and updates through `update:modelValue`.
- Do not introduce nested interactive semantics that would harm maintainability or accessibility.
- Keep `EventCard` reuse aligned with existing event-domain content architecture.
- Respect narrow-width and drawer-hosted interaction constraints.

## Verification

- Confirm the intended visual behavior and implementation approach before mutating the component.
- Verify keyboard interaction, focus behavior, and screen-reader semantics for single selection.
- Verify the carousel in both `AnchorPRSearchPage` main content and `BottomDrawer`.
- Verify reduced-motion fallback and no regression for disabled state.

## Explore Findings (2026-04-12)

- Current implementation is a horizontal scroll-snap list with `scrollIntoView` and selected-card scale/opacity tweaks, not a true relative-position carousel.
- The component is used through `AnchorPRSearchCriteriaForm` and appears in both the main search page body and the result-state `BottomDrawer`.
- Parent flow expects a valid selected event id whenever `events.length > 0`; long-lived `null` selection would conflict with the current page recovery model.
- The current select-mode `EventCard` renders as a `button` with `aria-pressed`, so wrapping it with hidden `radio + label` would create an awkward semantic structure.
- A safer direction is to let the carousel own radio semantics and let the card focus on visual content reuse.

## Execute Decision (2026-04-12)

- User confirmed scheme A: carousel owns the radio semantics instead of `hidden radio + label`.
- Mobile interaction became a first-class constraint, so the component now needs:
  - tap-to-select center or adjacent cards
  - horizontal swipe to move between events
  - keyboard radio navigation for non-touch users
- Selection order stays linear and bounded instead of wrapping from last back to first, because the event list order is parent-authoritative and finite.

## Execute Outcome (2026-04-12)

- Rebuilt `AnchorEventRadioCardCarousel` as a `radiogroup` with offset-based card transforms instead of scroll-snap scrolling.
- Added mobile-first swipe handling tuned for horizontal intent while allowing vertical drawer scrolling to continue when the gesture is mostly vertical.
- Kept the existing parent contract unchanged: `modelValue` remains the selected event id and updates through `update:modelValue`.
- Shifted `EventCard` select mode from interactive `button + aria-pressed` semantics to a visual-only card shell so the carousel wrapper can own the radio behavior cleanly.
- Preserved existing event-card content architecture and selected styling while making focus state visible on the carousel option itself.

## Execute Verification (2026-04-12)

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - Result still reports existing repo-wide baseline findings, but the new carousel-specific `clamp` regressions introduced during this task were removed before close-out.
- Remaining manual verification recommended:
  - swipe next/previous inside the search-page main content on a mobile viewport
  - swipe next/previous inside the `BottomDrawer`
  - keyboard Left/Right, Home/End, Enter/Space selection flow on desktop
