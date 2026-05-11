# Task Packet - PR Preview Card Consolidation

- Objective & Hypothesis: consolidate duplicated PR preview card surfaces into a PR-owned primitive. Hypothesis: a query-owned `PRPreviewCard` can cover Anchor Event PR rows, Event PR Search results, and My PRs list items while using caller context only for route, cover, time label, and action placement.
- Guardrails Touched:
  - Frontend PR-domain component ownership.
  - Event-domain browsing and Form Mode candidate presentation.
  - My PRs summary navigation.
  - Component index documentation.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - `pnpm --filter @partner-up-dev/backend build`

## Impact Handshake

- Address and Object:
  - `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.vue`
  - `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
  - `apps/frontend/src/domains/event/ui/composites/FormModeNoMatchResult.vue`
  - `apps/frontend/src/pages/EventPRSearchPage.vue`
  - `apps/frontend/src/pages/MyPRsPage.vue`
  - `apps/frontend/src/AGENTS.components.md`
  - `apps/frontend/src/domains/event/ui/AGENTS.md`
  - `apps/frontend/src/styles/_dcs.scss`
- State Diff: event-owned and page-local PR preview card rendering moves into one PR-owned primitive used by event, search, and personal PR list surfaces; `PRPreviewCard` now receives `prId`, owns the PR detail query, and renders canonical detail once loaded.
- Blast Radius Forecast:
  - event list and Form Mode candidate cards share the new visual class names, detail query behavior, and slot contract
  - Event PR Search loses the dedicated `PRSearchResultCard` component
  - My PRs list uses a domain component instead of page-local `ChoiceCard` markup and no longer depends on summary-only PR fields for location/count
- Invariants Check:
  - PR cards still navigate to canonical PR detail paths
  - Form Mode candidate join actions remain inside the card actions slot
  - event cover image resolution stays event-owned
  - My PRs created/joined grouping and de-duplication stay page-owned
  - canonical location and participant count come from `GET /api/pr/:id`
- Verification Result:
  - `pnpm --filter @partner-up-dev/frontend build` passed after making `PRPreviewCard` query-owned.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline after making `PRPreviewCard` query-owned.
  - `pnpm --filter @partner-up-dev/backend build` passed after removing the PR summary builder.
  - `git diff --check` passed after removing the PR summary builder.

## Mine PR List Contract Cleanup

- Address and Object:
  - `apps/backend/src/entities/partner-request.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-my-created-prs.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-my-joined-prs.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-pr-summaries.ts`
  - `apps/backend/src/domains/pr-core/use-cases/index.ts`
  - `apps/backend/src/domains/pr/model/pr/index.ts`
  - `apps/backend/src/services/PartnerRequestService.ts`
  - `apps/backend/src/index.ts`
  - `apps/frontend/src/domains/pr/queries/useMyCreatedPRs.ts`
  - `apps/frontend/src/domains/pr/queries/useMyJoinedPRs.ts`
  - `apps/frontend/src/domains/pr/routing/routes.ts`
  - `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.vue`
  - `apps/frontend/src/pages/MyPRsPage.vue`
- State Diff: mine PR endpoints return id-only list items; preview card data comes from the card-owned PR detail query.
- Blast Radius Forecast:
  - frontend mine list de-duplication still uses ids
  - event/search cards continue receiving event-owned cover/time context
  - legacy `PartnerRequestService` loses the summary facade method
- Invariants Check:
  - PR cards still navigate to canonical PR detail paths
  - My PRs created/joined grouping and de-duplication stay page-owned
  - participant count and location come from `GET /api/pr/:id`
- Verification Result:
  - `pnpm --filter @partner-up-dev/backend build` passed.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline.
  - `git diff --check` passed.
  - `rg` confirmed no remaining old PR summary symbols or PR preview snapshot props under `apps/backend/src` and `apps/frontend/src`.
