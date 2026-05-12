# Slice 3 Implementation Notes - Anchor Event Section Decomposition

## Scope Completed

- Added shared Anchor Event editor types:
  - `apps/frontend/src/domains/admin/ui/anchor-event/anchorEventEditorTypes.ts`
- Added section orchestrators:
  - `apps/frontend/src/domains/admin/ui/anchor-event/sections/AnchorEventBasicSection.vue`
  - `apps/frontend/src/domains/admin/ui/anchor-event/sections/AnchorEventLocationsSection.vue`
  - `apps/frontend/src/domains/admin/ui/anchor-event/sections/AnchorEventTimeSection.vue`
  - `apps/frontend/src/domains/admin/ui/anchor-event/sections/AnchorEventOtherSection.vue`
- Added business components:
  - `AnchorEventCoreInfoEditor.vue`
  - `AnchorEventMediaEditor.vue`
  - `AnchorEventCapacityDefaultsEditor.vue`
  - `AnchorEventLocationPoolEditor.vue`
  - `AnchorEventDefaultMeetingPointEditor.vue`
  - `AnchorEventLocationMeetingPointsEditor.vue`
  - `AnchorEventTimePoolStrategyEditor.vue`
  - `AnchorEventParticipationPolicyEditor.vue`
  - `AnchorEventTimeWindowsPreviewContent.vue`
  - `AnchorEventJoinGateEditor.vue`
  - `AnchorEventFeedbackQuestionnairePicker.vue`
  - `AnchorEventLandingRolloutEditor.vue`
- Replaced the inline basic, locations, time, and other blocks in `AdminAnchorEventPage.vue` with section orchestrators.
- Moved landing rollout query, mutation, validation, and draft state from the page into `AnchorEventLandingRolloutEditor.vue`.

## Boundary Result

- `AdminAnchorEventPage.vue` now owns:
  - Admin shell and navigation
  - selected Anchor Event coordination
  - current broad Anchor Event form state and full-object save assembly
  - page-level create/update mutation errors
- Section orchestrators own:
  - `BentoLayout`
  - `BentoItem`
  - card titles and card allocation
  - shared section save actions
- Business components own:
  - field-level business content
  - local derivations such as per-location meeting point rows
  - landing rollout query, mutation, validation, loading, and error rendering
- Business components render content without `.panel` or card shell containers.

## Remaining Architectural Debt

- Basic, locations, time, join gate, and feedback questionnaire now save through section-level frontend use-cases that wrap the existing full-object Anchor Event mutation.
- The next boundary improvement is a backend API split that gives each frontend use-case a matching narrower persistence endpoint.
- `AnchorEventTimeWindowsPreviewContent.vue` now renders a local recurring-rule preview from draft time-window strategy input. A future backend/frontend shared package can consolidate this frontend engine with the backend engine.

## Follow-up Adjustment - Time Window Preview Popup

- Added frontend pure preview engine:
  - `apps/frontend/src/domains/admin/model/anchorEventTimeWindowPreview.ts`
- Changed `AnchorEventTimeWindowsPreviewContent.vue` to accept:
  - `durationMinutes`
  - `earliestLeadMinutes`
  - `recurringRules`
  - optional `now`
- Changed `AnchorEventTimeSection.vue`:
  - removed the always-visible time-window preview Bento card
  - added a `预览` action to the time-window strategy card
  - hosts preview content in `Modal`
  - locks body scroll while the preview popup is open
- Added locale keys for the preview action, preview title, and empty recurring-rule state.

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - passed
- `.\node_modules\.bin\vite.CMD build --mode development` from `apps/frontend`
  - passed
- `.\node_modules\.bin\tsc.CMD --noEmit --pretty false` from `apps/frontend`
  - blocked by existing non-slice error: `src/domains/pr/use-cases/usePRCreateFlow.ts(57,20): error TS2349`
- Playwright mocked-API browser check against `http://localhost:4001/admin/anchor-events#anchor-event-time`
  - time section rendered and accepted draft edits
  - save triggered `PATCH /api/admin/anchor-events/1`
  - payload preserved existing event fields such as title and location pool
  - payload updated `timePoolConfig.durationMinutes` to `75`
  - payload updated the recurring rule to weekdays `[1, 3]`, time `18:30`, and description `weeknight`
- `agent-browser` against `http://localhost:4001/admin/anchor-events#anchor-event-basic`
  - confirmed local page and Admin navigation were reachable
  - existing backend availability left the page in loading state, so API-level rendering verification used a mocked Playwright run
- Playwright mocked-API browser check against `http://localhost:4001/admin/anchor-events`
  - `anchor-event-basic`, `anchor-event-locations`, `anchor-event-time`, and `anchor-event-other` each rendered 3 `.bento-item` containers
  - each of those sections rendered 0 `.panel` containers inside the section
  - locations section generated 2 per-location meeting point rows from the mocked location pool
  - landing rollout save triggered `PUT /api/admin/events/1/landing-config`
  - landing rollout payload was `{ FORM: 30, CARD_RICH: 70, LIST: 0 }` with `assignmentRevision: 2`
  - basic section save triggered `PATCH /api/admin/anchor-events/1` with the edited title
- Follow-up Playwright mocked-API browser check against `#anchor-event-time`
  - time section rendered 2 `.bento-item` containers after moving preview to popup
  - rendered 0 `.panel` containers inside the section
  - rendered 1 `预览` action in the time-window strategy card
  - preview popup displayed locally computed recurring windows for 2026-05-11, 2026-05-13, and 2026-05-15

## Follow-up Adjustment - Anchor Event Time Use-Case Surface

- Updated durable docs:
  - `docs/20-product-tdd/cross-unit-contracts.md`
- Added a section-level frontend use-case:
  - `apps/frontend/src/domains/admin/use-cases/anchor-event/useUpdateAnchorEventTimePolicy.ts`
- The time policy use-case:
  - owns the time pool input builder
  - merges the current backend workspace Anchor Event with the edited time-policy draft
  - submits through the existing full-object Anchor Event update mutation
  - keeps the section-level call surface stable for a later backend endpoint split
- Changed `AdminAnchorEventPage.vue` so the Anchor Event time section saves through `useUpdateAnchorEventTimePolicy`.
- New Anchor Event creation still uses the full event create path because creation requires a complete Anchor Event input.

## Follow-up Verification - Anchor Event Time Use-Case Surface

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - command returned success
  - still reported existing token governance findings in `src/domains/pr/ui/primitives/PRPreviewCard.vue`
- `.\node_modules\.bin\vite.CMD build --mode development` from `apps/frontend`
  - passed
- `.\node_modules\.bin\tsc.CMD --noEmit --pretty false` from `apps/frontend`
  - blocked by existing non-slice error: `src/domains/pr/use-cases/usePRCreateFlow.ts(57,20): error TS2349`

## Follow-up Adjustment - Complete Anchor Event Use-Case Split

- Added shared mutation input adapter:
  - `apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.ts`
- Added create/update use-cases:
  - `useCreateAnchorEvent.ts`
  - `useUpdateAnchorEventBasic.ts`
  - `useUpdateAnchorEventLocations.ts`
  - `useUpdateAnchorEventTimePolicy.ts`
  - `useUpdateAnchorEventOtherSettings.ts`
- Changed `AdminAnchorEventPage.vue`:
  - basic section save calls `useUpdateAnchorEventBasic`
  - locations section save calls `useUpdateAnchorEventLocations`
  - time section save calls `useUpdateAnchorEventTimePolicy`
  - other section save calls `useUpdateAnchorEventOtherSettings`
  - new Anchor Event creation calls `useCreateAnchorEvent`
  - edit-mode save disable rules now follow the active section's validation surface
- Existing tag and landing rollout business components keep their own query/mutation ownership.

## Follow-up Verification - Complete Anchor Event Use-Case Split

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - passed with no findings outside baseline
- `.\node_modules\.bin\vite.CMD build --mode development` from `apps/frontend`
  - passed
- `.\node_modules\.bin\tsc.CMD --noEmit --pretty false` from `apps/frontend`
  - blocked by existing non-slice error: `src/domains/pr/use-cases/usePRCreateFlow.ts(57,20): error TS2349`
- Playwright mocked-API browser check against `http://localhost:4001/admin/anchor-events`
  - basic save triggered `PATCH /api/admin/anchor-events/1` and updated only the basic edited field in the section summary: title `City Walk Updated`
  - locations save triggered `PATCH /api/admin/anchor-events/1` and updated location pool to `["人民公园", "苏州河"]`
  - time save triggered `PATCH /api/admin/anchor-events/1` and updated duration to `75` plus recurring rule weekdays `[1, 3]`, time `18:30`, description `weeknight`
  - other save triggered `PATCH /api/admin/anchor-events/1` and updated feedback questionnaire template id to `10`
  - each section payload preserved unrelated Anchor Event fields from the mocked workspace event
