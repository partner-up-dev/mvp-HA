# PR Page Implementation Boundary Smell Map

## Objective & Hypothesis

Map the PR Page implementation and related component boundaries before refactoring.

Hypothesis: the current page IA is acceptable; the maintenance cost comes from a route entrypoint owning too many domain-level decisions, action orchestration details, modal state, and cross-process handoff concerns.

## Guardrails Touched

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/pr/ui/composites/*`
- `apps/frontend/src/domains/pr/ui/sections/*`
- `apps/frontend/src/domains/pr/use-cases/*`

## Current Findings

- `PRPage.vue` is 1293 lines and still owns page assembly, PR detail read state, publish flow, join and waitlist flow refs, confirm/check-in flow, exit/cancel-waitlist confirmation, utility navigation, share drawer state, creator edit modals, pending WeChat action replay, handoff target registration, and telemetry impression/click emission.
- The route page defines domain action model types locally: `DockActionKey`, `DockActionItem`, and `ViewerState`. These are PR participation concepts and should have a domain owner closer to `domains/pr`, either as a use-case projection or an extracted action panel component contract.
- The `dockActions` computed block mixes eligibility projection, translated labels, button tone, pending state, and blocked-reason rendering. That couples backend-authoritative viewer state to page-local UI vocabulary and makes later action changes touch the route entrypoint.
- `blockedReasonText`, `resolveConfirmTip`, and `resolveCheckInTip` sit in the page while their inputs and semantics belong to PR participation and attendance. This keeps rule-adjacent copy and temporal interpretation outside a named domain boundary.
- Utility actions are visually simple but semantically mixed: booking-support handoff, PR messages, share drawer, and event-plaza discovery are route-adjacent secondary actions. A small `PRUtilityActions` section could localize visibility rules and route intents while leaving page ownership to assembly.
- Pending WeChat action replay currently sits in `PRPage.vue` and knows every PR action kind. This is cross-process orchestration and would fit a route-level use case such as `usePRPendingWeChatActionReplay` with an explicit command adapter.
- The page has accumulated many modal refs and error refs (`showEditModal`, `showModifyModal`, `showExitConfirmModal`, `showCancelWaitlistConfirmModal`, `showShareDrawer`, and action error refs). Several can move behind section components or composables once action ownership is split.

## Candidate Refactor Slices

1. Extract a domain projection for primary participation actions from `PRPage.vue`, returning action kind, labels, disabled state, pending state, and tips.
2. Extract `PRContextualActions` to own notices, join/waitlist flow placement, confirm/check-in, exit, cancel-waitlist, and local action errors.
3. Extract `PRUtilityActions` to own booking-support, message, share, and event-plaza secondary actions.
4. Extract pending WeChat action replay into a use-case composable that receives command callbacks from the page or contextual-actions owner.

## Verification Plan

- Keep each refactor slice behavior-preserving.
- Run `pnpm --filter @partner-up-dev/frontend build`.
- Run `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Use `agent-browser` on `http://localhost:4001/pr/2` for layout and action-surface smoke checks after each UI extraction.
