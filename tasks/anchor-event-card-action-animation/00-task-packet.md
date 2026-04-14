# Anchor Event Card Action Animation

## Objective & Hypothesis

Make `AnchorEventPage` card-mode actions reuse the same exit animation as swipe gestures, so tapping `下一个` or `加入` feels consistent with dragging the active demand card.

Hypothesis: the current mismatch exists because the action buttons emit page events directly instead of going through `AnchorEventDemandCard`'s swipe/exit state machine. Exposing a narrow imperative trigger on the front card should keep the mutation local and preserve the existing page contract.

## Guardrails Touched

- Keep ownership inside `apps/frontend/src/domains/event/ui/*` and `apps/frontend/src/pages/AnchorEventPage.vue`.
- Do not change the page-level event contract for skip/detail handling.
- Reuse the existing demand-card motion states instead of duplicating animation logic in the section wrapper.
- Preserve disabled behavior for `加入` when no detail target exists.

## Verification

- `pnpm --filter @partner-up-dev/frontend build`
- Confirm the card-mode action buttons now route through the same exit animation path as swipe gestures by code inspection.

## Execute Outcome

- Exposed a narrow `triggerAction()` handle from `AnchorEventDemandCard` so non-gesture actions can reuse the existing exit/rebound state machine.
- Wired the card-mode `下一个` and `加入` buttons in `AnchorEventCardModeSection` to call the front card handle first, with the old direct emit kept as a defensive fallback.
- Kept page-level skip/detail semantics unchanged: skip still rotates to the next card and detail still routes into the APR detail page.

## Execute Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` still reports the repo's existing baseline-related findings; this task did not introduce additional token-governance regressions in the touched files.
