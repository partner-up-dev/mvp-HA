# Task Packet - Issue 168 Anchor Event Form Mode Recommendation Flow

## MVT Core

- Objective & Hypothesis: land GitHub issue `#168` on top of `#180` by replacing the current `/e/:eventId` `FORM` placeholder with a form-first join flow. The user selects location, start time, and optional preferences, then long-presses the join-intent CTA. Backend returns one matched recommendation plus ordered candidates. If a matched recommendation exists, the splash handoff continues into the canonical PR page. If no matched recommendation exists, `/e/:eventId` switches into an inline candidate-list plus create-fallback state. Hypothesis: keeping the Form Mode flow inside one route-level state machine preserves low-friction ad-scan continuity and avoids serializing recommendation result state into a separate page.
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

### 2. Matched Flow

- the user completes location, start time, and optional preferences in one form-first landing surface.
- the primary CTA keeps join-intent copy:
  - `加入一场 {time} 在 {location} 的 {event.title} 活动`
- long-press completion submits the current selection for backend recommendation.
- backend returns:
  - one matched recommendation
  - one ordered candidate list
- during Form Mode bootstrap, backend may return one default selection from the nearest upcoming joinable PR in the current Anchor Event context.
- if a matched recommendation exists, the long-press splash opens a route-level matched PR handoff overlay with the PR Facts Card preview and ordinary `取消` / `加入` actions.
- tapping the handoff `加入` action enters that PR's canonical `/pr/:id` route; PR Page owns the final join action after the handoff settles.
- if no matched recommendation exists, the same `/e/:eventId` Form Mode surface switches into an inline no-match result state.
- the no-match result state contains:
  - ordered candidate list
  - create fallback action `都不合适，帮我找`
- PageHeader back inside the no-match result state returns to the Form Mode selection state.
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
- if backend bootstrap returns a default selection, Location Control initializes to that selected PR's location when the location still exists in the event location pool.

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
- if backend bootstrap returns a default selection whose start time is selectable only through Advanced Mode, Time Control may enter Advanced Mode automatically.

### 5. Preference Control

- persisted preference values still live in `PartnerRequest.preferences`.
- Anchor Event owns one event-specific preset tag pool as the Form Mode option source and semantic expansion of those preference strings.
- the preset tag pool is Anchor Event domain data and should use a dedicated durable structure rather than piggybacking on generic rollout config.
- each preset tag has:
  - `label`
  - `description`
- category is derived from the substring before the first `:` in `label`.
- tags with the same derived category are mutually exclusive within that category.
- if the event preset tag pool is empty, the Preference Control is hidden from Form Mode.
- if at least one category exists, the page shows one `Cell` per category, and each cell opens a category-scoped `BottomDrawer`.
- category-scoped drawer titles use `选择{category}偏好`.
- category-scoped tag badges display the label content after the category prefix, so the category is not repeated inside that drawer.
- tag badges carry only selection state and short label; descriptions are shown in a separate inline drawer panel.
- tag badges use pill geometry with a roughly `80px` adaptive minimum width; the `+` creation chip uses secondary visual tone.
- the inline description panel appears only when the active drawer has a selected tag with non-empty description.
- clicking the Preference Drawer backdrop commits the drawer selection with the same effect as confirm.
- tags without a category are grouped under a separate `其它` cell when categorized tags also exist.
- if the whole preset pool is uncategorized, the page shows one `选择偏好` cell.
- the drawer must support user-authored new tags with label-only input.
- a user-authored tag participates immediately in:
  - the current landing selection state
  - the current recommendation request
  - the eventual create payload if create fallback is chosen
- the same user-authored tag is submitted into the event-specific preset tag pool as pending content and requires admin approval or publish before later visitors can see it in Form Mode.

### 6. Recommendation Semantics

- recommendation and ranking stay backend-authoritative.
- backend starts from one base PR pool:
  - PRs from this Anchor Event's visible PR contexts
  - joinable PR status
- backend first derives a matched pool from that base PR pool.
- matched eligibility requires:
  - exact selected location
  - start time within a `5` minute tolerance
  - no same-category preference conflict
- if the matched pool is non-empty, backend ranks that matched pool and returns the highest-ranked item as `matchedRecommendation`.
- if the matched pool is empty, backend ranks the whole base PR pool and returns the top entries as `orderedCandidates`.
- score is a ranking function, not a matched eligibility gate.
- Form Mode bootstrap default selection uses the same visible joinable PR context, sorts upcoming PRs by closest start time, and skips PRs whose start time is outside `earliestLeadMinutes`.
- backend should evaluate whole PRs rather than only tag overlap.
- ranking dimensions include:
  - time fit
  - location fit
  - tag fit
  - group momentum
- exact same tag label contributes positive signal.
- same derived category but different tag label contributes negative signal because category options are mutually exclusive.
- different categories remain neutral to each other.
- uncategorized tags remain neutral unless there is exact label overlap.
- group momentum is based on how close the PR is to reaching `minPartners` after the current user joins.
- matched recommendation is consumed as the handoff target after the Form Mode long-press submit.
- matched recommendation preview uses the same `PRFactsCard` component as PR Page; the card accepts a `prId` and owns its PR detail data request.
- the visible result UI is only for no-match recommendations.
- no-match recommendation result is an inline Form Mode state containing ordered candidates plus create fallback.
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
- Form Mode join CTA should be a local primary-outline custom button rather than an extension of the shared `Button` primitive.
- trembling intensity follows both charge progress and overload progress through X/Y displacement, slight rotation, faster cadence, and an outline pressure pulse.
- the long-press CTA suppresses text selection, browser touch callout, drag start, and context menu during the gesture.
- during an active long-press, the CTA installs document-level capture guards for `contextmenu`, `selectstart`, `dragstart`, and `touchmove`.
- splash-related visual implementation is allowed to bypass token governance for local tint math and adaptive geometry when those values directly define fill pressure, liquid wave motion, or route handoff reveal behavior.
- long-press completion starts a Form Mode surface-owned liquid overlay:
  - after the CTA has filled and overloaded, primary liquid bursts outward from the CTA center in all directions.
  - the viewport cover uses a CTA-origin blob sized by distance to the farthest viewport corner, avoiding directional rectangle expansion gaps.
  - droplets, organic border-radius morphing, and shine provide the splash / liquid burst cue.
  - the overlay stays filled while recommendation resolves
  - when the inline no-match result is ready, the primary liquid drains downward to reveal the result state
- after the burst, the flow should continue into a route-level PR handoff overlay.
- the handoff PR Facts Card appears from the center with a small-to-large spin-in animation.
- during `/e/:eventId` to `/pr/:id` navigation, the primary splash remains above the app until the PR Page target card is ready.
- once PR Page renders its PR Facts Card target, the overlay card aligns into that card's final rect through a FLIP transform and one full Y-axis spin, then the splash drains from top to bottom and reveals the real PR Page card in the same position.
- Form Mode full-screen join splash and matched PR handoff drain use the same route-handoff-owned SVG liquid layer driven by `requestAnimationFrame`: three sine-wave path layers share the primary color family, move with phase offsets, increase wave deformation during flow, and calm down near empty.
- Form Mode fill passes the CTA origin rect into that liquid layer, so the full-screen liquid starts from the long-press CTA area, expands through a radial reveal, then holds as a filled liquid surface before either draining into the no-match result or handing off into the matched PR overlay.
- if backend finds a matched recommendation, that PR is the target of the same burst handoff.
- if backend does not find a matched recommendation, the liquid fill completes first, the inline no-match result state mounts underneath the filled surface, and the drain reveals that result state.

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
  - To: `/e/:eventId` `FORM` mode is a full selection -> recommendation -> matched handoff or inline no-match result flow
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
  - manual verification for FORM selection, matched long-press handoff, no-match candidate list, create fallback, and CARD_RICH non-regression

## Execution Plan

1. Align issue body and local task packet with the current product direction and confirmed interaction semantics.
2. Add durable data and admin support for the event-specific preset tag pool plus pending user-submitted tags.
3. Add Form Mode init read contracts for location gallery, wheel-picker options, event duration, and published preset tags.
4. Extract or reuse the carousel primitive and build the Form Mode location, time, and preference controls.
5. Add backend recommendation contract with matched recommendation and ordered candidate list.
6. Add `AnchorEventPRCard` actions slot for candidate-list join actions.
7. Assemble Form Mode matched handoff and inline no-match candidate-list / create-fallback state.
8. Implement the Form Mode join long-press animation and PR handoff continuity.
9. Add backend-authored Form Mode default selection from the nearest upcoming joinable PR.
10. Add telemetry for landing exposure, no-match recommendation exposure, candidate selection, create fallback intent, long-press completion, and confirm-join funnel.
11. Verify with backend typecheck, frontend build, and manual flow checks across `FORM`, `CARD_RICH`, and PR handoff continuity.

## Current Non-Goals

- changing `/events/:eventId` rich-page responsibility
- introducing a third hybrid landing variant in `#168`
- implementing the location application flow from `#178`
- changing `#180` landing assignment ownership or rollout semantics
- moving the final PR detail route away from `/pr/:id`

## Surface Artifacts

- `01-form-mode-selection-surface.md`: current selection-state layout snapshot
- `02-form-mode-recommendation-surface.md`: current no-match result-state layout snapshot
- `03-form-mode-preference-drawer.md`: preference drawer layout snapshot
- `04-form-mode-other-events-drawer.md`: other-events drawer layout snapshot

## Verification Outcome

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend exec node --import tsx --test src/domains/anchor-event/services/form-mode.test.ts`
- `pnpm --filter @partner-up-dev/frontend build`
  - latest backend test and typecheck pass after renaming the direct handoff response to `matchedRecommendation`, adding 5-minute start tolerance, and replacing the large score threshold with matched eligibility plus small signed ranking.
  - latest backend test and typecheck pass after adding Form Mode bootstrap default selection from the nearest upcoming visible joinable PR under `earliestLeadMinutes`.
  - latest frontend build passes after removing `/er`, moving recommendation orchestration into `AnchorEventFormModeSurface`, and adding `AnchorEventPRCard` actions slot.
  - latest frontend build passes after applying backend-authored default location/start selection and allowing Time Control to auto-enter Advanced Mode for externally supplied selectable starts.
  - latest frontend build passes after adding route-level matched PR handoff overlay, moving `PRFactsCard` to `prId`-owned data loading, and removing PR Page `entry=landing_join` auto modal behavior.
  - latest frontend build passes after splitting Preference Control into empty-pool hidden state, category-scoped cells/drawers, and category-prefix-stripped tag badges.
  - latest frontend build passes after replacing the matched PR handoff drain with a three-layer SVG liquid-wave splash.
  - latest frontend build passes after replacing the Form Mode full-screen join splash fill/hold/drain with the same SVG liquid-wave splash.
  - latest frontend build passes after resolving token-governance findings through scaffold placement, `dcs` promotion, and narrow component / splash exceptions.
  - latest frontend build passes after replacing matched PR card target alignment with a FLIP transform that rotates once around the Y axis and lands on the PR Page Facts Card rect.
  - latest frontend build passes after delaying the no-match result state mount until Form Mode liquid fill completion, so result content is revealed only during the drain.
  - latest token governance check reports no findings outside baseline after keeping splash tint / adaptive geometry inside a narrow exception, moving landing loading / error placement into `FooterRevealPageScaffold`, promoting Form Mode location-card height into `dcs`, and documenting the shared primitive component-contract exception.
- `git diff --check` passes for the current worktree diff.
- `agent-browser` manual verification:
  - `/api/events/2/form-mode` returns `defaultSelection` from PR `31`, location `云山水榭`, start `2026-04-28T11:00:00.000Z`.
  - forcing `/e/2` into FORM mode initializes the selected location to `云山水榭`, the selected date to `4/28`, the selected time to `19:00`, and the CTA to `加入一场 4/28 19:00 在 云山水榭 的学习冲刺活动`.
  - `/e/1` has an empty `presetTags` response and renders no Preference Control.
  - `/e/2` renders category cells `类别1` and `类别2`.
  - opening `类别1` shows drawer title `选择类别1偏好`, only the scoped `测试` tag, and the badge omits the `类别1:` prefix.
  - selecting `类别1:测试` closes back to a cell value of `测试`.
  - preference drawer footer uses one two-column action row with cancel on the left and confirm on the right.
  - preference drawer panel accepts a `40vh` minimum height and uses larger internal chip spacing.
  - custom tag creation is inline in the tag list through a `+` chip; created custom chips can be removed through their `X` action before confirm.
  - preference drawer tag badges show short labels only before selection; selecting a described tag reveals its description as a separate inline panel.
  - backdrop-clicking the preference drawer after selecting `英语` closes the drawer and persists the cell value as `科目 英语`.
  - Form Mode join CTA renders as a shadowless primary-outline custom button.
  - long-pressing the Form Mode join CTA completes the gesture and enters the recommendation result flow without showing a browser context menu.
  - synthetic `contextmenu` dispatched during active long-press returns `defaultPrevented=true`, `dispatchResult=false`, and reaches no bubble listener.
  - long-pressing `/e/2` covers the viewport with primary liquid, then drains to reveal the inline candidate result state.
  - synthetic long-press sampling shows trembling grows from early charge to overload: duration `111ms -> 91ms -> 82ms`, X displacement about `2.18px -> 3.42px -> 3.98px`, and outline pressure `1.58px -> 2.57px -> 4.15px`.
  - synthetic long-press splash sampling on `/e/2` now shows `form-mode-join-splash` mounting `LiquidWaveSplash` with `3` SVG paths and an origin-centered radial reveal, for example `circle(565.29px at 759.14px 669.67px)`.
  - matched long-press on `/e/2` opens `matched-pr-handoff--preview` with PR `31` Facts Card preview plus `取消` / `加入` actions.
  - after the Form Mode fill finishes on `/e/2`, the form overlay clears and the matched handoff preview mounts its own `LiquidWaveSplash` with `3` SVG paths.
  - clicking the matched handoff `加入` action routes to `/pr/31` with `handoff=matched_pr`, clears the overlay after PR Facts Card target registration, and leaves the PR Page join modal closed.
- durable docs updated for Form Mode workflow, invariants, cross-unit contracts, and state authority

## Defect Follow-up - Matched Recommendation Eligibility

Observed defect:

- changing Form Mode location or start time still routed into an existing currently-recruiting PR.

Root cause:

- backend recommendation ranking used location and time as score signals, then treated the first ranked candidate as the direct handoff target.
- this allowed close-but-inexact candidates to trigger the long-press matched handoff.

Superseded interim rule:

- the interim direct handoff target required exact selected location, exact selected start time, no same-category preference conflict, and score at least `320`.
- ineligible candidates remain available in `orderedCandidates`.
- `orderedCandidates` filtered out the selected direct handoff target by PR id, so the candidate list stayed correct when the handoff target was selected from the ranked list.

Current rule:

- rename the direct handoff response to `matchedRecommendation`.
- matched eligibility is computed before score ranking.
- matched eligibility requires exact selected location, start time within `5` minutes, and no same-category preference conflict.
- if multiple PRs are matched, score chooses the best matched PR.
- if no PR is matched, score ranks the whole base PR pool into `orderedCandidates`.
- score uses small signed values and includes group momentum based on remaining people needed after the current user joins.
