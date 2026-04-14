# Anchor Event Card Stack Promotion

## Objective & Hypothesis

Make `AnchorEventPage` card mode feel like the next demand card promotes from the stack underneath after a swipe-left `下一个`, instead of appearing to spring back from the card that just exited.

Hypothesis: the current behavior comes from reusing the same front-card component instance after the exit transition completes. When the parent swaps in the next card's props, the reused instance resets from the old offscreen transform back to center, which reads like the dismissed card bouncing back. Keying the front shell by `activeDemandCard.cardKey` should force a fresh mount for each new front card and let the existing `card-front-promote` animation replay from the preview-card pose.

## Guardrails Touched

- Keep the change local to `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`.
- Preserve the existing swipe exit/rebound state machine in `AnchorEventDemandCard.vue`.
- Do not change card ordering, skip semantics, or detail-route behavior.
- Reuse the existing preview-depth pose and `card-front-promote` animation instead of introducing a second motion system.

## Verification

- Inspect the keyed front-shell render path to confirm each active card promotion remounts the front layer.
- `pnpm --filter @partner-up-dev/frontend build`
- Confirm by code inspection that the new front-card mount starts from the same translate/scale values used by the first preview card.

## Execute Outcome

- Keyed the card-mode front shell with `activeDemandCard.cardKey` so the active front layer no longer reuses the exiting card instance.
- This makes the next card mount fresh and replay the existing front-promotion animation instead of resetting the old offscreen transform back to center.

## Execute Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
