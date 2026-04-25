# Task Packet - Issue 168 Anchor Event Landing Page

## MVT Core

- Objective & Hypothesis: land GitHub issue `#168` as a new ad-scan-first Anchor Event landing route at `/e/:eventId`, with backend-authored shell assignment between a new Form Mode landing surface and a reused rich-card surface, while keeping `/events/:eventId` as the existing rich Anchor Event page. Hypothesis: the safest shape is to keep landing orchestration separate from the current event detail route, persist event-owned landing config through the infra `config` table, let the shell own only assignment and fallback behavior, and let Form Mode own its own data reads, recommendation flow, and PR handoff.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - frontend route/page assembly in `apps/frontend/src/app/router.ts` and `apps/frontend/src/pages/*`
  - frontend event-domain and PR-domain composition under `apps/frontend/src/domains/event/*` and `apps/frontend/src/domains/pr/*`
  - backend Anchor Event, PR create/join, admin Anchor Event workspace, analytics ingest, and entity schema under `apps/backend/src/*`
- Verification:
  - Read GitHub issue `#168` plus linked issues `#170`, `#177`, and `#178`
  - Inspect current frontend routes, Anchor Event page, Event PR search, shared drawer/carousel primitives, and PR join confirmation flow
  - Inspect backend public Anchor Event contracts, event-assisted create command, PR search/join flows, Anchor Event schema, POI public contract, admin Anchor Event workspace, and telemetry ingest surface
  - Confirm high-level product decisions with the user before implementation

## Exploration Notes

- Current public event routes:
  - `/events`
  - `/events/search`
  - `/events/:eventId`
  - `/e/:eventId` does not exist yet
- Current `/events/:eventId` already owns:
  - card/list browsing
  - `GET /api/events/:eventId`
  - `GET /api/events/:eventId/demand-cards`
  - event-assisted create through canonical `POST /api/pr/new/form`
  - event-specific beta-group entry
- Current reusable frontend pieces that can support `#168`:
  - `AnchorEventRadioCardCarousel.vue`
  - `AnchorEventHorizontalList.vue`
  - `BottomDrawer.vue`
  - existing PR join confirmation flow in `PRPage.vue`
  - event card/list route wiring and page-view telemetry
- Current backend/event model already supports `#170` time-pool strategy:
  - `timePoolConfig`
  - `systemLocationPool`
  - `userLocationPool`
  - event-assisted create using canonical PR create payload
- Current public/backend gaps for `#168`:
  - no landing route or landing-shell page
  - no event-owned landing config or shell-assignment contract
  - no event-owned preference tag pool
  - no form-mode read contract for location cards plus tag-pool semantics
  - no backend-authoritative command that resolves "match existing PR or auto-create PR"
  - no landing-specific telemetry taxonomy for experiment exposure and primary CTA clicks
- Current POI public contract only returns:
  - `id`
  - `gallery`
  - this is enough for a first landing-form location card baseline, while `#177` and `#178` can layer richer meetup/place-application behavior later

## User Confirmed Decisions

- `/e/:eventId` serves the ad-scan landing flow
- `/events/:eventId` stays as the existing rich page
- `Advanced Mode` should allow choosing dates and times outside the event time pool
- `#168` should lay the foundation for `#177` and `#178`, while those issues land separately
- `#177` and `#178` can be marked as blocked by `#168`
- Preference matching should use category-aware ranking
- Unclassified tags should stay neutral and should not receive extra bonus weight
- Matching can operate without a hard minimum score gate, or with an effectively trivial floor such as `1`
- PR ranking should consider candidate crowd state such as current partner count, not preferences alone
- Landing primary UX should surface ranked candidate options plus a primary create action when the current selection has no exact-fit match
- When the system picks one best matching PR, the handoff UX should feel like an in-place promotion from landing card into PR detail, using full-screen splash plus PR Facts card motion continuity
- `#180` should persist landing config through the infra `config` table while keeping key semantics and schema owned by Anchor Event
- `Durable docs / contract alignment` is standard execution work and should not be presented as a primary `#180` specification item
- `preferenceTagPool` belongs to `#168` rather than `#180`
- form-mode business data should be fetched and managed by the Form Mode view, not by the landing shell
- backend should decide landing mode, and frontend should stabilize that result per user with `localStorage`
- landing shell mode assignment should use a short timeout and fall back to `FORM`
- accepted default decisions for `#180`:
  - assignment cache key should include `eventId + assignmentRevision`
  - shell assignment timeout should default to `500ms`
  - initial stabilization should rely on frontend cache rather than user-identity-aware backend bucketing
  - minimal landing-config payload should stay shell-focused, such as ratio override and assignment revision
  - `CARD_RICH` ratio `0` means the activity effectively runs in pure `FORM` rollout, without a second explicit enable switch
- GitHub issue descriptions for `#180` and `#168` should be written as product-level tasks.
  - `Summary`, `Rationale`, `Specification`, and `Acceptance Criteria` should describe user experience, operator control, product rules, and externally visible outcomes.
  - implementation choices such as `config` storage, `localStorage`, timeout values, and authority boundaries should live under `Technical Constraints` or this task packet.

## Working Design Direction

- Route split:
  - `/e/:eventId` becomes the experiment-owned landing entry
  - `/events/:eventId` remains the current rich browsing/detail route
- Experiment shape:
  - landing page decides between `FORM` and `CARD_RICH`
  - variant is component-mounted, not a new query-mode on `/events/:eventId`
  - event-level override belongs to Anchor Event owned config, persisted through the infra `config` table rather than frontend local rules
  - backend owns the assignment result, while frontend caches the resolved mode in `localStorage` for a stable per-user experience
  - shell assignment should use a short timeout and default to `FORM` when the assignment query does not resolve in time
- Form-mode baseline:
  - location field uses carousel-like radio cards
  - time field uses a dedicated date/time selector with advanced-mode unlock
  - preferences use a drawer-based grouped selector
  - Form Mode owns the fetch lifecycle for its own location, time-pool, and preference-tag inputs
  - primary action should navigate into `/pr/:id` and reuse the existing PR-side join confirmation modal
- Matching/create boundary:
  - frontend should submit one canonical selection payload
  - backend should authoritatively decide whether to route to an existing matching PR or create a new PR
  - this keeps matching truth off the client and stays aligned with current authority rules
  - when multiple joinable PRs satisfy the same selection, backend ranking should choose the primary recommended PR and also be able to return the ordered candidate set for richer landing UX

## Latest Product Direction (2026-04-25)

- Ranking model:
  - score the whole PR candidate rather than only the preference overlap
  - keep `time + location` as the strongest matching anchors
  - treat categorized preference tags as one scoring dimension
  - keep uncategorized or `其它` tags neutral
  - include candidate crowd state such as partner count in the ranking score
- Candidate presentation:
  - when the current selection yields no exact-fit primary recommendation, show an ordered candidate list and place the primary `创建` action at the top of that list surface
  - candidate ordering should emphasize time closeness first, then preference affinity, then crowd-state desirability
- Primary join handoff:
  - when the system has a best matching PR, use a cinematic full-screen splash
  - animate the selected PR Facts card from center-stage through spin and scale-up into the PR detail layout
  - place `确认加入` directly under the promoted facts card before the final PR detail content fully resolves
  - successful confirm should trigger a second celebratory burst and then settle into the canonical Anchor PR detail page with spatial continuity
- User-facing copy direction:
  - landing should preserve the user's mental model around `加入`
  - system-internal `create PR` should be translated into a clearer user intent such as `发起这一场` or `帮我约这一场`
  - standalone `创建` wording is currently considered too implementation-oriented for ad-scan-first traffic

## Remaining Open Questions

- Preference ranking still needs one implementation-level score formula.
  - Need to choose exact weights across time proximity, location fit, category overlap, category conflict, and crowd-state desirability.
  - Need to decide whether free-text or operator-unclassified preferences affect ranking immediately or stay as low-confidence signals until normalized.
- Advanced-mode create semantics still need one explicit runtime boundary.
  - Product direction allows dates and times outside the event time pool.
  - Implementation still needs one rule for how far Form Mode may escape current event-owned time guidance while staying inside the Anchor Event flow.
- Recommendation telemetry still needs one canonical funnel definition.
  - Need to decide which click or success event owns the top-line "加入转化率" interpretation for the landing experiment.

## Implementation Slice Forecast

- Slice 1: align PRD/Product TDD for `/e/:eventId`, shell assignment ownership, and public landing semantics
- Slice 2: add backend/admin foundation for event-owned landing config persisted through the infra `config` table
- Slice 3: add backend-authoritative shell assignment contract plus `/e/:eventId` shell route, `localStorage` stabilization, and short-timeout fallback
- Slice 4: add event-owned preference tag pool plus Form Mode read contract
- Slice 5: implement Form Mode landing UI with reusable event-domain components
- Slice 6: implement backend recommendation/create command, cinematic PR handoff, telemetry, and manual verification

## Proposed Sub-Issue Breakdown

### New Blocking Issue - Landing Foundation

- Goal:
  - add event-owned landing config, persisted through the infra `config` table
  - add admin editing for that landing config
  - add one backend-authoritative shell assignment contract
  - add frontend `/e/:eventId` route and shell assignment flow with `localStorage` stabilization and short-timeout fallback
- Scope:
  - backend config ownership, schema parse/serialize, controller/use-case/admin workspace
  - public route shell, loading/error/not-found states, experiment assignment, and shell fallback behavior
  - `/events/:eventId` stays as the existing rich page
- Depends on:
  - none

### Issue `#168` Narrowed Scope - Form Mode Recommendation Flow

- Goal:
  - implement the new form-first landing experience end to end
  - build location carousel, date/time picker, advanced mode toggle, preference drawer, event-owned preference tag pool, and public copy
  - add backend-authoritative recommendation and candidate ordering
  - support best-match handoff, candidate list, fallback create intent, and landing-to-PR continuity
  - land splash / card-promotion / confetti-like motion together with the form flow
  - add landing experiment telemetry
- Scope:
  - Form Mode owned data reads and UI
  - backend recommendation command and candidate ordering
  - PR handoff integration
  - motion polish and analytics
- Depends on:
  - `Landing Foundation`

### Follow-On Issues Outside `#168`

- `#177` should build on the landing/location foundation from `#168`
- `#178` should build on the landing/location foundation from `#168`
