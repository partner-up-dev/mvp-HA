# Task Packet - Issue 157 Browse Other Events

## MVT Core

- Objective & Hypothesis: Complete issue #157 by surfacing other active Anchor Events from Anchor Event and Anchor PR detail surfaces. Hypothesis: when the current batch or PR is not a fit, adjacent cross-event discovery keeps the user inside the anchor-collaboration loop without weakening the current event context.
- Guardrails Touched:
  - Product PRD: Anchor collaboration browse/detail workflows.
  - Frontend: home event highlight reuse, Anchor Event Page card/list detail shells, Anchor PR detail utility actions.
  - Local worktree safety: keep the existing batch-description edits in the frontend worktree intact.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Intent.
- Active Mode: Execute.
- Scope Decision:
  - Reuse the existing active-event catalog contract instead of introducing a new API.
  - Keep the reusable event-card rail inside the event domain, not `shared/ui`.
  - Use a lightweight link on `/apr/:id` and a richer horizontal list on `/events/:eventId`.

## Outcome

- Reused the existing `AnchorEventHorizontalList` event-domain composite so the home highlight rail and new event-detail discovery blocks stay visually aligned.
- Added a "看看其它活动" horizontal rail to Anchor Event Page card-empty and list-mode secondary-card areas, filtering out the current event while preserving backend-provided exposure order.
- Completed the Anchor PR Page right-aligned secondary text link to the event plaza and wired the missing locale keys.
- Refined the list-mode "other events" surface to reuse the same shared `ExpandableCard` collapse pattern as the beta-group card.
- Added a `shorter` `EventCard` variant and routed the horizontal rail through it so rail cards stay compact without changing plaza or carousel cards.
- Added an `outline` `EventCard` surface variant and applied it only to the "other events" rails so secondary discovery cards read lighter than primary event cards.
- Updated PRD workflow wording so cross-event discovery from event and PR detail surfaces is explicit durable product truth.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
