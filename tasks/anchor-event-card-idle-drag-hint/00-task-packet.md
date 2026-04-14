# Anchor Event Card Idle Drag Hint

## Objective & Hypothesis

Add a drag-affordance hint for `AnchorEventPage` card mode: when the user enters card mode and stays inactive for 3 seconds, the active demand card should wobble left and right at half travel twice to suggest swipe interaction.

Hypothesis: page-level scheduling plus a domain-local imperative wobble hook on `AnchorEventDemandCard` will keep the behavior scoped, reusable, and aligned with the existing swipe-preview feedback channel.

## Guardrails Touched

- Keep card-mode entry timing in `apps/frontend/src/pages/AnchorEventPage.vue`.
- Keep card motion ownership inside `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`.
- Do not reintroduce toast-based affordance if it is no longer implemented.
- Respect reduced-motion preference by skipping the wobble hint.

## Verification

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Confirm by code inspection that entering card mode schedules one idle hint after 3 seconds, and any card interaction cancels the pending hint.

## Execute Outcome

- `AnchorEventPage` now schedules a one-shot drag-affordance hint 3 seconds after entering card mode, including the initial route-enter case and the header switch case.
- Any meaningful card interaction now cancels the pending hint window before it fires.
- `AnchorEventDemandCard` exposes a narrow `playHintWobble()` handle and performs the wobble locally while reusing the existing swipe-preview feedback channel.
- No card-mode toast implementation was found in the current code, so there was nothing to remove beyond superseding the old task intent.

## Execute Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` still reports the repo's existing 42 non-baseline findings; this task did not add new token-governance regressions in the touched files.
