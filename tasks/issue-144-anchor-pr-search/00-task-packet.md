# Issue 144 Anchor PR Search Description

## Objective & Hypothesis

Improve GitHub issue #144 while it is still in left-shift discussion/design.

Hypothesis: the issue should describe a shorter Anchor PR discovery path without changing the existing product rule that user-created Anchor PRs remain scoped to Anchor Event, batch, and location context.

## Guardrails Touched

- Product PRD: Anchor Event browsing and Anchor PR scenario rules.
- Product TDD: stable route/API contract and backend authority over PR eligibility, status, timing, and identity.
- Frontend: route page assembly, domain-owned query hooks, reusable event/PR UI primitives.
- Backend: controller-only protocol conversion, domain use-cases, repository CRUD boundaries.

## Verification

- Read current issue #144 body.
- Read relevant PRD and Product TDD anchors.
- Inspect current Anchor Event / Anchor PR frontend and backend implementation.
- Compare proposed description against related issues and existing route/API constraints.
- Update issue #144 body through GitHub CLI once the revised description is coherent.

## Outcome

- Updated https://github.com/partner-up-dev/mvp-HA/issues/144 through `gh issue edit`.
- Verified the updated body with `gh issue view 144 --json number,title,body,state,labels,url`.
- Applied follow-up feedback: removed the standalone Left-Shift section, changed the API candidate to reuse `GET /api/events` for event catalog and use an independent Anchor PR search API, added IA wireframes, added single-result auto-redirect behavior, and tightened Technical Constraints.
- Applied final discussion adjustments: Anchor Event Cards are the radio-card options, search criteria use `eventId + dates`, and search result cards avoid repeating Event / Batch / Type information.
- Solidified the accepted direction into durable docs:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`

## Execute Slice (2026-04-11)

- Classified the new request as `Intent` and entered `Execute` mode after confirming the durable owner was already aligned in PRD/Product TDD.
- Current implementation gap confirmed:
  - frontend has `/events` and `/events/:eventId`, but not `/events/search`
  - backend has `/api/events` and `/api/apr/:id`, but not `/api/apr/search`
  - `GET /api/events` already returns a rich ACTIVE event catalog, so the missing work is the independent Anchor PR search read path plus search-page assembly
- Implementation handshake for this slice:
  - backend owner: `pr-anchor` search use-case + `anchor-pr.controller.ts`
  - frontend owner: route assembly in `src/app/router.ts`, domain-owned read hook, and a new `/events/search` page
  - invariants: no standalone Anchor PR create route, no frontend-owned eligibility/status/timing truth, no PR search mounted under `/api/events`
- Planned verification for the execution slice:
  - frontend build / typecheck
  - backend build / typecheck
  - manual route/query recovery check for `/events/search`
  - manual single-result redirect and browser-back replay guard check

## Execute Outcome (2026-04-11)

- Implemented backend Anchor PR search read path at `GET /api/apr/search` with:
  - `eventId + repeated date` query contract
  - ACTIVE event validation
  - product-local date matching for Anchor PR start time
  - backend-authoritative filtering for visible, non-expired-batch, `OPEN` / `READY` Anchor PR candidates
  - stable result ordering by PR time, batch time, and PR creation time
- Implemented frontend `/events/search` route with:
  - event card selection from `GET /api/events`
  - query-driven `eventId + date[]` state recovery
  - calendar multi-select limited to the current 4-week window and non-past dates
  - loading / empty / error states
  - result list rendering and single-result auto-redirect to `/apr/:id`
  - BottomDrawer-based criteria editing in result state
- Added an Event Plaza entry button that routes users into `/events/search`.
- Updated Product TDD to record the adopted concrete backend endpoint: `GET /api/apr/search`.

## Execute Refinement (2026-04-11)

- User review requested structural follow-up before commit:
  - `/events/search` must reuse the same Anchor Event card information architecture as Event Plaza
  - date selection must be extracted from the search form into a reusable picker primitive
  - event selection should live in a reusable carousel radio-card component
  - the calendar should render a shorter 4-week window instead of a 6-week month grid
- Owner decision for the refinement slice:
  - event-card reuse stays in `domains/event`
  - the product-local calendar picker is narrow enough for `shared/ui/forms`
  - route fallback/defaulting and current-window policy stay in the page/domain assembly layer

## Execute Refinement Outcome (2026-04-11)

- Refined `EventCard.vue` so `/events/search` now renders the same event-card information architecture as Event Plaza while preserving the existing link-mode behavior used by Event Plaza and landing highlights.
- Added `domains/event/ui/composites/AnchorEventRadioCardCarousel.vue` so event selection is no longer inline page markup and the selected card is centered/emphasized as a carousel radio-card control.
- Added `shared/ui/forms/ProductLocalDateCalendarPicker.vue` so date selection is no longer embedded inside the search form and can be reused as a product-local date-key multi-select primitive.
- Aligned frontend route recovery and backend validation to the same 4-week calendar window so the picker UI and `GET /api/apr/search` contract no longer disagree about which dates are valid.

## Execute Verification (2026-04-11)

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`
- Remaining manual verification still recommended:
  - invalid query fallback to default ACTIVE event and default dates
  - single-result auto-redirect plus browser-back behavior in a real browser session
