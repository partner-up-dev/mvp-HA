# Task Packet - Issue 168 Form Mode Surface Refactor

## MVT Core

- Objective & Hypothesis: reduce `AnchorEventFormModeSection.vue` from a 1000+ line mixed orchestration / control / result component into mode-level surfaces and owned controls. Hypothesis: renaming event mode UI around `Surface` and moving local control state into the controls that own it will make Form Mode easier to reason about while preserving the current `#168` behavior.
- Guardrails Touched:
  - `apps/frontend/src/ARCHITECTURE.md`
  - `apps/frontend/src/AGENTS.components.md`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorEventLandingPage.vue`
  - `apps/frontend/src/domains/event/ui/sections/*`
  - `apps/frontend/src/domains/event/ui/surfaces/*`
  - future `apps/frontend/src/domains/event/ui/controls/form-mode/*` or equivalent local event-domain control folder
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - source scan for old `AnchorEvent*ModeSection` imports after the naming slice
  - behavior check for `/e/:eventId` `FORM`, `/e/:eventId` `CARD_RICH`, and `/events/:eventId` list/card mode entrypoints

## Current Findings

- `apps/frontend/src/ARCHITECTURE.md` currently names `ui/sections` in the suggested domain subfolders and dependency direction.
- The same architecture doc does not currently define a durable UI hierarchy such as `Surface -> Section -> Control -> Primitive`.
- `apps/frontend/src/AGENTS.components.md` already has component splitting and state ownership guidance:
  - split large Vue components along behavior ownership
  - child components should own state, derived values, validation, and handlers that are local to their interaction
  - parent surfaces should own cross-control flow state, route coordination, backend orchestration, analytics, and handoff behavior
- This means the refactor should either:
  - add `ui/surfaces` as a first-class architecture concept before moving files there
  - or keep files under `ui/sections` while using `Surface` in component names
- Preferred direction for this refactor: introduce `ui/surfaces` explicitly in the architecture docs, then move mode-level components there.

## Confirmed Direction From Discussion

### 1. Rename Slice Before Returning To `#168`

- Do one mechanical slice first:
  - `AnchorEventCardModeSection.vue` -> `AnchorEventCardModeSurface.vue`
  - `AnchorEventListModeSection.vue` -> `AnchorEventListModeSurface.vue`
- Update route/page imports and any task/docs references that point at those live component filenames.
- Verify frontend build.
- Commit this rename slice independently before continuing Form Mode decomposition.

### 2. Form Mode Naming

- `AnchorEventFormModeSection.vue` should become `AnchorEventFormModeSurface.vue`.
- This rename belongs with the Form Mode decomposition slice because the current file's internals will be split at the same time.
- The mode-level surface should be at the same conceptual layer as Card Mode and List Mode surfaces.

### 3. Avoid `FormModeSelectionSurface`

- Do not introduce a `FormModeSelectionSurface`.
- The selection form layout can stay inside `AnchorEventFormModeSurface.vue` after local controls are extracted.
- Rationale: a separate selection surface would mostly wrap three controls and actions without owning enough behavior to justify another surface layer.

### 4. Control Names And Ownership

- Use `FormModeLocationControl`.
- Use `FormModeTimeControl`.
- Use `FormModePreferenceControl`.
- Prefer `Control` naming because these components own user interaction, local state, and view derivation.
- Avoid `FormModePreferenceCell` as the primary component name.

### 5. Preference Control Ownership

- `FormModePreferenceControl` owns:
  - the visible cell layout
  - `BottomDrawer`
  - drawer draft selected category map
  - drawer draft uncategorized labels
  - custom tag input
  - local duplicate handling
  - submitting user-authored labels to the event preference-tag submission endpoint
  - local mutation error display for custom tag submission
- `FormModePreferenceControl` exposes:
  - `v-model:preferences`
  - enough disabled / loading props only if the parent flow needs them
- `FormModePreferenceControl` does not expose:
  - `localCustomTags`
  - `newCustomLabels`
- Data ownership claim: user-authored tag moderation submission is local to the preference interaction. Parent flow only needs the final preference label list for recommendation and create fallback.

### 6. Time Control Ownership

- `FormModeTimeControl` owns:
  - default date/time option grouping
  - advanced-mode option grouping
  - `advancedMode` internal toggle state
  - selected date correction when mode or options change
  - selected time correction when selected date changes
  - duration label derivation
- `FormModeTimeControl` exposes:
  - `v-model:startAt`
  - optional selected date only if route/debug/telemetry later needs it externally
- `FormModeTimeControl` does not expose:
  - `advancedMode`
- Data ownership claim: `advancedMode` is a UI mechanism for choosing a start time. Parent flow should receive the resulting selected start time. Telemetry that needs to know whether advanced mode was used can be emitted by the time control or surfaced through a narrow event such as `advanced-used`, rather than making parent state own the toggle.

### 7. Location Control Ownership

- `FormModeLocationControl` owns:
  - location card view model
  - stable gallery image selection
  - carousel item rendering
  - selected location caption crossfade
- `FormModeLocationControl` exposes:
  - `v-model:locationId`
  - selected location label through a narrow event or helper callback only if parent needs display copy for CTA
- Data ownership claim: the selected location id is cross-control flow state because it affects CTA copy, recommendation request, and create fallback. The image/caption rendering details are local to location control.

## Recommendation Flow Reframing

### Current Decision

The previously implemented independent `/er/:eventId` recommendation page is superseded by the corrected Form Mode flow model.

- `/e/:eventId` keeps the complete Form Mode journey in one route-level state machine.
- Form Mode selection owns the long-press CTA `加入一场 {time} 在 {location} 的 {event.title} 活动`.
- Long-press completion submits the selection to backend recommendation.
- Backend returns `matchedRecommendation` plus `orderedCandidates`.
- If `matchedRecommendation` exists, the splash handoff continues into that PR's canonical `/pr/:id`.
- If `matchedRecommendation` is absent, `/e/:eventId` switches into an inline no-match result state.
- The no-match state renders ordered candidates plus create fallback `都不合适，帮我找`.
- PageHeader back from the no-match state returns to Form Mode selection.
- The selection state owns the `查看所有场次` secondary action.

### Candidate Card Rule

The no-match candidate list should reuse the event-domain PR card primitive instead of creating page-local candidate cards.

- Enhance `AnchorEventPRCard.vue` with an `actions` slot.
- The slot layout should be a flex row with `gap: var(--sys-spacing-small)`.
- List Mode can omit the slot and keep current browse behavior.
- Form Mode candidate rows provide a full-width join action through the slot.

### Backend Matching Rule

- Base PR pool: this Anchor Event's visible PR contexts with joinable PR status.
- Matched eligibility: exact selected location, start time within `5` minutes, and no same-category preference conflict.
- Score chooses the top item inside the matched pool when more than one PR is matched.
- When the matched pool is empty, score ranks the whole base PR pool into ordered candidates.
- Group momentum in score means how close the PR is to `minPartners` after the current user joins.

### Superseded Route Detail

`/er/:eventId?l=&d=&t=&p=` and `AnchorEventFormModeRecommendationSurface` as an independent page-level experience have been removed from the frontend implementation.

## Proposed Refactor Slices

### Slice A - UI Surface Vocabulary And Card/List Rename

- Status: completed.
- Update frontend architecture docs to introduce `ui/surfaces`.
- Move or rename Card/List mode components:
  - `domains/event/ui/surfaces/AnchorEventCardModeSurface.vue`
  - `domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
- Update live imports in:
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorEventLandingPage.vue`
  - any related tests/docs/tasks
- Run frontend build.
- Commit independently.

### Slice B - Form Selection Controls

- Status: completed.
- Rename `AnchorEventFormModeSection.vue` to `AnchorEventFormModeSurface.vue`.
- Extract `FormModeLocationControl`.
- Extract `FormModeTimeControl`.
- Extract `FormModePreferenceControl`.
- Keep selection layout inside `AnchorEventFormModeSurface.vue`.
- `FormModeTimeControl` uses shared `shared/ui/forms/WheelPicker.vue` for both date and time columns.
- Move local control state into the owning controls according to the ownership rules above.
- Keep parent-owned state limited to:
  - bootstrap data
  - selected location id
  - selected start time
  - selected preference labels
  - recommendation submission
  - route transition into recommendation result

### Slice C - Recommendation Result Surface

- Status: completed under the corrected Form Mode flow model.
- Removed the independent recommendation page route.
- Moved recommendation orchestration back into `AnchorEventFormModeSurface`.
- Rendered only the no-match result state inline.
- Matched recommendation routes from Form Mode long-press splash to canonical `/pr/:id`.
- Create fallback stays inside the Form Mode flow.
- `AnchorEventPRCard` now has an `actions` slot for Form Mode candidate joins.

Verification performed:

- `pnpm --filter @partner-up-dev/frontend build`

Backend recommendation defect follow-up:

- the former primary response is renamed to `matchedRecommendation`.
- matched eligibility now requires exact selected location, start time within `5` minutes, and no same-category preference conflict.
- ordered candidates are ranked from the whole base PR pool when the matched pool is empty.
- service-level tests cover matched acceptance plus location, start time tolerance, preference-conflict rejection, and group momentum scoring.

## Risks And Questions

- Manual browser verification should still cover matched handoff and no-match candidate/create paths once representative seed data is available.
- If `FormModePreferenceControl` owns backend submission, it also needs query invalidation strategy for `anchorEvent.formMode(eventId)`. That should live inside its mutation hook or inside the control.
- If `FormModeTimeControl` hides `advancedMode`, recommendation telemetry can infer advanced selection in the Form Mode flow by comparing selected `startAt` to the event's default start option pool.
- Introducing `ui/surfaces` changes frontend architecture vocabulary. The first rename slice should update docs so the folder structure and dependency direction stay explicit.

## Current Non-Goals

- broad reworking of backend recommendation scoring beyond matched eligibility
- changing Form Mode product behavior
- changing Card/List mode runtime behavior during the rename slice
- changing the reusable carousel primitive
- changing `/events/:eventId` and `/e/:eventId` route semantics
