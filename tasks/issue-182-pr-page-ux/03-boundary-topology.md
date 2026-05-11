# PR Page Boundary Topology

## Objective & Hypothesis

Show PR Page boundary smells through topology.

Hypothesis: the current IA is serviceable, while the current ownership graph concentrates too many responsibilities in the route entrypoint. A topology makes the boundary pressure easier to discuss than a flat smell list.

## Current Ownership Topology

```text
apps/frontend/src/pages/PRPage.vue
|
+-- Route Entry Context
|   |
|   +-- route params: pr id, fromEvent, entry
|   +-- router navigation: back fallback, booking support, messages
|   +-- page loading/error/detail state
|
+-- Backend Read + Cache Refresh
|   |
|   +-- usePRDetail(id)
|   +-- refetch after publish/join/waitlist/exit/cancel
|
+-- Summary Assembly
|   |
|   +-- PageHeader
|   +-- PRFactsCard
|   +-- prDisplayTitle fallback
|   +-- facts-card handoff target registration
|
+-- Primary Participation Action Projection      [boundary pressure]
|   |
|   +-- ViewerState
|   +-- DockActionKey
|   +-- DockActionItem
|   +-- dockActions computed
|   +-- blockedReasonText
|   +-- resolveConfirmTip
|   +-- resolveCheckInTip
|
+-- Primary Participation Action Execution       [boundary pressure]
|   |
|   +-- PRJoinFlow
|   +-- PRWaitlistFlow
|   +-- usePRAttendanceActions
|   +-- useSharedPRActions
|   +-- useCancelWaitlistPR
|   +-- confirm / check-in / exit / cancel-waitlist handlers
|   +-- local action error refs
|
+-- Cross-process WeChat Replay                  [boundary pressure]
|   |
|   +-- readPendingWeChatAction
|   +-- clearPendingWeChatAction
|   +-- matchPendingActionForCurrentPR
|   +-- attemptPendingWeChatActionReplay
|   +-- watcher-driven replay trigger
|
+-- Creator Controls
|   |
|   +-- publish draft
|   +-- edit content modal
|   +-- modify status modal
|
+-- Secondary Utility Actions                    [boundary pressure]
|   |
|   +-- booking-support entry
|   +-- message entry
|   +-- share drawer
|   +-- event-plaza discovery link
|
+-- Reliability / Reminder Presentation
|   |
|   +-- APRNotificationSubscriptions
|
+-- Telemetry
|   |
|   +-- primary CTA impression watcher
|   +-- primary CTA click tracking
|   +-- creator secondary action click tracking
|
+-- Modals / Drawers / Confirm Dialogs
    |
    +-- share drawer
    +-- edit modal
    +-- status modal
    +-- exit confirm dialog
    +-- cancel waitlist confirm dialog
    +-- check-in followup modal
```

## Boundary Smell Reading

```text
Route page responsibility profile

Navigation shell                 : expected page ownership
Data read and loading state       : expected page ownership
Section placement                 : expected page ownership
Domain action projection          : overloaded into page
Domain action execution wiring    : overloaded into page
Cross-process replay orchestration: overloaded into page
Rule-adjacent copy resolution     : overloaded into page
Modal state for many subflows      : overloaded into page
Telemetry policy                  : partially overloaded into page
```

The most expensive coupling is not the visual hierarchy. It is the page's role as a hub for PR participation semantics, WeChat replay, telemetry, and modal orchestration at the same time.

## Candidate Target Topology

```text
PRPage.vue
|
+-- Route Entry Context
|   |
|   +-- route params
|   +-- page loading/error/detail state
|   +-- high-level section placement
|
+-- usePRPageRouteContext
|   |
|   +-- pr id
|   +-- route event id
|   +-- back fallback
|   +-- entry surface
|
+-- PRDetailSummaryRegion
|   |
|   +-- PageHeader
|   +-- PRFactsCard
|   +-- handoff target binding
|
+-- PRContextualActions
|   |
|   +-- notices
|   +-- join/waitlist flows
|   +-- confirm/check-in
|   +-- exit
|   +-- cancel waitlist
|   +-- local action errors
|   |
|   +-- usePRPrimaryActionProjection
|       |
|       +-- ViewerState
|       +-- DockActionItem
|       +-- blocked reason text
|       +-- confirm/check-in tip text
|
+-- usePRPendingWeChatActionReplay
|   |
|   +-- reads pending action
|   +-- matches current PR
|   +-- invokes command adapter callbacks
|
+-- PRCreatorControls
|   |
|   +-- publish draft
|   +-- edit content
|   +-- modify status
|
+-- PRUtilityActions
|   |
|   +-- booking-support entry
|   +-- message entry
|   +-- share entry
|   +-- event-plaza link
|
+-- PRReliabilitySection
    |
    +-- APRNotificationSubscriptions
```

## First Refactor Slice Candidate

```text
Extract PRUtilityActions
|
+-- Lowest risk
+-- Purely secondary action surface
+-- Preserves current route and feature semantics
+-- Shrinks PRPage template and style ownership
+-- Keeps later contextual-action extraction easier to review
```

## Higher-value Refactor Slice Candidate

```text
Extract usePRPrimaryActionProjection + PRContextualActions
|
+-- Highest ownership payoff
+-- Moves participation action semantics out of route entrypoint
+-- Separates eligibility projection from page assembly
+-- Requires careful event/callback contract design
+-- Needs stronger smoke coverage with agent-browser
```

## Verification Plan

- For topology-only updates: `git diff --check`.
- For implementation extraction:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - `agent-browser --session pr-page-verify open http://localhost:4001/pr/2`
  - `agent-browser --session pr-page-verify snapshot -i`
  - `agent-browser --session pr-page-verify eval --stdin` for target action geometry or visibility checks
