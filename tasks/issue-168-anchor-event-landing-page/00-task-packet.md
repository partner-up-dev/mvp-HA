# Task Packet - Issue 168 Anchor Event Form Mode Recommendation Flow

## MVT Core

- Objective & Hypothesis: land GitHub issue `#168` on top of `#180` by replacing the current `/e/:eventId` `FORM` placeholder with a form-first join flow. The user selects location, start time, and optional preferences, then long-presses the join-intent CTA. Backend returns one primary recommendation plus ordered candidates. If a primary recommendation exists, the splash handoff continues into the canonical PR page. If no primary recommendation exists, `/e/:eventId` switches into an inline candidate-list plus create-fallback state. Hypothesis: keeping the Form Mode flow inside one route-level state machine preserves low-friction ad-scan continuity and avoids serializing recommendation result state into a separate page.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - frontend landing, event, PR, admin, and telemetry surfaces under `apps/frontend/src/*`
  - backend Anchor Event, PR read/create/join, analytics, and admin surfaces under `apps/backend/src/*`
- Verification:
  - read the latest GitHub issue `#168` body after the post-`#180` product discussion
  - reconcile the original issue intent with the current confirmed product decisions before implementation
  - inspect current `/e/:eventId`, `/events/:eventId`, PR detail, event search, admin Anchor Event workspace, and reusable time/location controls
  - update this task packet and the GitHub issue description before execute mode

## Durable Baseline After `#180`

- `/e/:eventId` already exists as the landing shell entry with backend-authored mode assignment, frontend stabilization, and timeout fallback.
- `/events/:eventId` remains the existing rich browse surface and should keep that responsibility.
- current `FORM` mode is only a placeholder and does not own real business data reads.
- current PR detail already has a join-confirmation modal and is still the canonical detail route.
- Anchor Event detail already exposes enough event-side baseline for `#168` to build on:
  - time-pool strategy output
  - event duration
  - system and user location pools
  - POI gallery reads
  - event-assisted create defaults

## Current Product Direction (2026-04-25)

### 1. Landing Experiment Shape

- `/e/:eventId` remains the landing shell entry from `#180`.
- `#168` replaces only the `FORM` mounted surface; `CARD_RICH` remains the current rich-card landing arm.
- experiment comparison remains `FORM` vs `CARD_RICH` in this ticket.
- the previously discussed hybrid mode that auto-switches after skipped cards is out of scope for `#168`.

### 2. Primary Flow

- the user completes location, start time, and optional preferences in one form-first landing surface.
- the primary CTA keeps join-intent copy:
  - `加入一场 {time} 在 {location} 的 {event.title} 活动`
- long-press completion submits the current selection for backend recommendation.
- backend returns:
  - one primary recommendation
  - one ordered candidate list
- if a primary recommendation exists, the long-press splash continues into that PR's canonical `/pr/:id` route.
- if no primary recommendation exists, the same `/e/:eventId` Form Mode surface switches into an inline no-primary result state.
- the no-primary result state contains:
  - ordered candidate list
  - create fallback action `都不合适，帮我找`
- candidate list PR cards reuse `AnchorEventPRCard` with a bottom `actions` slot for the full-width join action.
- the selection state's secondary CTA `查看所有场次` routes into the existing Anchor Event list-mode browsing path.

### 3. Location Control

- the location control should reuse the same visual and interaction language as the current Anchor Event card carousel.
- implementation should extract one reusable carousel primitive rather than duplicating page-local landing logic.
- each location card uses one stable gallery image from that location's gallery set.
- the selected location title is rendered centered below the carousel, not inside each card.
- changing selection should animate the centered location title with a short crossfade.
- location means the event venue or POI-level place choice; meetup point is a separate, more precise coordination concept and should not be collapsed into the location control.
- the location-creation card is out of scope for `#168`.

### 4. Time Control

- default time selection uses one two-column wheel picker.
- product-facing labels:
  - date column: `M.D`
  - time column: `HH:mm`
- default options come from the Anchor Event time-pool output generated from the `#170` strategy.
- subtle helper text below the control shows the event duration, for example `持续 1h`.
- that same duration row owns the `Advanced Mode` toggle.
- `Advanced Mode` is a toggle-based state, not a separate route or drawer.
- `Advanced Mode` unlocks date/time combinations beyond the concrete time-pool items while still respecting event `earliestLeadMinutes`.
- `Advanced Mode` granularity is fixed at `5` minutes.

### 5. Preference Control

- persisted preference values still live in `PartnerRequest.preferences`.
- Anchor Event owns one event-specific preset tag pool as the Form Mode option source and semantic expansion of those preference strings.
- the preset tag pool is Anchor Event domain data and should use a dedicated durable structure rather than piggybacking on generic rollout config.
- each preset tag has:
  - `label`
  - `description`
- category is derived from the substring before the first `:` in `label`.
- tags with the same derived category are mutually exclusive within that category.
- tags without a category are grouped under `其它`.
- if the whole preset pool is uncategorized, the group label should be `偏好`.
- the page itself shows one summary cell; editing happens in a `BottomDrawer`.
- the drawer must support user-authored new tags with label-only input.
- a user-authored tag participates immediately in:
  - the current landing selection state
  - the current recommendation request
  - the eventual create payload if create fallback is chosen
- the same user-authored tag is submitted into the event-specific preset tag pool as pending content and requires admin approval or publish before later visitors can see it in Form Mode.

### 6. Recommendation Semantics

- recommendation and ranking stay backend-authoritative.
- backend should evaluate whole PR candidates rather than only tag overlap.
- ranking dimensions include:
  - time fit
  - location fit
  - tag fit
  - candidate crowd state
- exact same tag label contributes positive signal.
- same derived category but different tag label contributes negative signal because category options are mutually exclusive.
- different categories remain neutral to each other.
- uncategorized tags remain neutral unless there is exact label overlap.
- primary recommendation is consumed as the handoff target after the Form Mode long-press submit.
- the visible result UI is only for no-primary recommendations.
- no-primary recommendation result is an inline Form Mode state containing ordered candidates plus create fallback.
- candidate rows should use the Anchor Event PR card primitive with an action slot rather than a page-local recommendation card.

### 7. Join CTA Animation And Handoff

- the special long-press join animation belongs only to the Form Mode page's join CTA.
- it should not automatically spread to generic PR-page join buttons or candidate-list secondary buttons.
- gesture semantics:
  - `pointerdown` enters a non-linear charge curve
  - the CTA background fills horizontally in one direction
  - after reaching `100%`, the CTA enters a short overload state
  - continued press causes the filled state to burst in the same direction into a full-screen splash
  - releasing early should trigger an elastic rollback of fill and pressure state
- after the burst, the flow should continue into PR handoff continuity and then settle on canonical `/pr/:id`.
- if backend finds a primary recommendation, that PR is the target of the same burst handoff.
- if backend does not find a primary recommendation, the burst resolves into the inline no-primary result state.

### 8. Header And Other Events

- `PageHeader` right action remains `其它活动`.
- tapping it opens a `BottomDrawer`.
- the drawer contains one carousel-like Anchor Event selector rather than a plain list.

### 9. Admin And Moderation Expectations

- admin needs event-level editing for the preset tag pool and its publish state.
- admin should be able to distinguish published preset tags from pending user-submitted tags.
- later implementation can refine the moderation UX, but `#168` must preserve the product rule that only approved or published tags become visible to later visitors.

## Impact Handshake For Execute Mode

- Address and Object:
  - Anchor Event public read contracts for Form Mode
  - Anchor Event admin contracts for preset tag pool and moderation state
  - frontend `/e/:eventId` Form Mode surface
  - frontend event UI local rules in `apps/frontend/src/domains/event/ui/AGENTS.md`
  - frontend reusable carousel primitive and time / preference controls
  - frontend `AnchorEventPRCard` action slot
  - backend recommendation and candidate-ordering use-cases
  - PR handoff continuity and landing telemetry
- State Diff:
  - From: `/e/:eventId` `FORM` mode is a static placeholder
  - To: `/e/:eventId` `FORM` mode is a full selection -> recommendation -> primary handoff or inline no-primary result flow
- Blast Radius Forecast:
  - Anchor Event public routes
  - Anchor Event admin workspace
  - PR detail handoff behavior
  - telemetry taxonomy and event names
  - landing vs rich-card A/B comparison semantics
- Invariants Check:
  - `/events/:eventId` keeps current rich-page responsibility
  - `/e/:eventId` shell ownership from `#180` stays unchanged
  - backend keeps recommendation, ordering, moderation, and create/join truth
  - canonical detail route remains `/pr/:id`
- Verification:
  - backend typecheck
  - frontend build
  - manual verification for FORM selection, primary long-press handoff, no-primary candidate list, create fallback, and CARD_RICH non-regression

## Execution Plan

1. Align issue body and local task packet with the current product direction and confirmed interaction semantics.
2. Add durable data and admin support for the event-specific preset tag pool plus pending user-submitted tags.
3. Add Form Mode init read contracts for location gallery, wheel-picker options, event duration, and published preset tags.
4. Extract or reuse the carousel primitive and build the Form Mode location, time, and preference controls.
5. Add backend recommendation contract with ranking and ordered candidate list.
6. Add `AnchorEventPRCard` actions slot for candidate-list join actions.
7. Assemble Form Mode primary handoff and inline no-primary candidate-list / create-fallback state.
8. Implement the Form Mode join long-press animation and PR handoff continuity.
9. Add telemetry for landing exposure, no-primary recommendation exposure, candidate selection, create fallback intent, long-press completion, and confirm-join funnel.
10. Verify with backend typecheck, frontend build, and manual flow checks across `FORM`, `CARD_RICH`, and PR handoff continuity.

## Current Non-Goals

- changing `/events/:eventId` rich-page responsibility
- introducing a third hybrid landing variant in `#168`
- implementing the location application flow from `#178`
- changing `#180` landing assignment ownership or rollout semantics
- moving the final PR detail route away from `/pr/:id`

## Surface Artifacts

- `01-form-mode-selection-surface.md`: current selection-state layout snapshot
- `02-form-mode-recommendation-surface.md`: current no-primary result-state layout snapshot
- `03-form-mode-preference-drawer.md`: preference drawer layout snapshot
- `04-form-mode-other-events-drawer.md`: other-events drawer layout snapshot

## Verification Outcome

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend exec node --import tsx --test src/domains/anchor-event/services/form-mode.test.ts`
- `pnpm --filter @partner-up-dev/frontend build`
  - latest frontend build passes after removing `/er`, moving recommendation orchestration into `AnchorEventFormModeSurface`, and adding `AnchorEventPRCard` actions slot.
- durable docs updated for Form Mode workflow, invariants, cross-unit contracts, and state authority

## Defect Follow-up - Primary Recommendation Eligibility

Observed defect:

- changing Form Mode location or start time still routed into an existing currently-recruiting PR.

Root cause:

- backend recommendation ranking used location and time as score signals, then treated the first ranked candidate as `primaryRecommendation`.
- this allowed close-but-inexact candidates to trigger the primary long-press handoff.

Applied rule:

- a primary recommendation must have exact selected location, exact selected start time, no same-category preference conflict, and score at least `320`.
- ineligible candidates remain available in `orderedCandidates`.
- `orderedCandidates` filters out the selected primary by PR id, so the candidate list stays correct when a primary is selected from the ranked list.
