# L3 Plan: Implementation Plan for Anchor PR / Community PR Split

## Stage Goal

Define the exact execution roadmap for implementing the approved design.

This plan assumes:

- no backward compatibility layer is required
- old generic `/pr` detail/create surfaces can be replaced directly
- implementation should still be incremental enough to keep the repo buildable after each major slice

## Implementation Principles

- keep `partner_requests.id` stable throughout
- do not redesign `Partner`
- finish backend subtype split before switching frontend pages
- prefer additive/refactor steps over giant rewrites in one file
- introduce new scenario pages/components first, then remove old mixed ones
- keep the codebase buildable after each workstream

## Workstream Order

1. backend schema and entity split
2. backend repository/domain/controller split
3. frontend route/query/type split
4. frontend page/component refactor
5. docs alignment and final verification

## Workstream 1: Backend Schema and Entity Split

### Goal

Create real storage boundaries before moving business logic.

### Files

- `apps/backend/src/entities/partner-request.ts`
- `apps/backend/src/entities/anchor-partner-request.ts`
- `apps/backend/src/entities/community-partner-request.ts`
- `apps/backend/src/entities/index.ts`
- `apps/backend/drizzle/*.sql`
- `apps/backend/drizzle/meta/*`

### Steps

1. Add `anchor_partner_requests` entity.
2. Add `community_partner_requests` entity.
3. Keep `partner_requests` root schema with only approved shared fields.
4. Generate a migration that:
   - creates both subtype tables
   - backfills Anchor rows from existing root columns
   - backfills Community rows with `creation_source = 'LEGACY'`
5. Add a cleanup migration that removes moved Anchor-only columns from `partner_requests`.

### Data Migration Logic

Pseudo-code:

```sql
insert into anchor_partner_requests (...)
select
  id as pr_id,
  anchor_event_id,
  batch_id,
  visibility_status,
  auto_hide_at,
  resource_booking_deadline_at,
  payment_model_applied,
  discount_rate_applied,
  subsidy_cap_applied,
  cancellation_policy_applied,
  economic_policy_scope_applied,
  economic_policy_version_applied
from partner_requests
where pr_kind = 'ANCHOR';

insert into community_partner_requests (pr_id, creation_source)
select id, 'LEGACY'
from partner_requests
where pr_kind = 'COMMUNITY';
```

### Completion Criteria

- new subtype tables exist
- historical data is backfilled
- root table no longer owns Anchor-only columns after cleanup migration

## Workstream 2: Backend Repository, Domain, and Controller Split

### Goal

Replace the current mixed `pr-core` / mixed controller model with scenario-owned modules.

### Files

- `apps/backend/src/repositories/PartnerRequestRepository.ts`
- new:
  - `apps/backend/src/repositories/PRRootRepository.ts`
  - `apps/backend/src/repositories/AnchorPRRepository.ts`
  - `apps/backend/src/repositories/CommunityPRRepository.ts`
- `apps/backend/src/domains/pr-core/**/*`
- new:
  - `apps/backend/src/domains/pr-anchor/**/*`
  - `apps/backend/src/domains/pr-community/**/*`
- `apps/backend/src/controllers/partner-request.controller.ts`
- new:
  - `apps/backend/src/controllers/pr.controller.ts`
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/controllers/community-pr.controller.ts`
- `apps/backend/src/index.ts`

### Steps

#### Step 2.1 Repository Split

1. Create `PRRootRepository` with:
   - shared create/update/find-by-id
   - list by creator
   - list by ids
2. Move Anchor-only query methods into `AnchorPRRepository`.
3. Create `CommunityPRRepository` with subtype create/read/update methods.
4. Remove or retire `PartnerRequestRepository` after callers are migrated.

#### Step 2.2 Domain Split

Move use cases:

- to `pr-community`:
  - `create-pr-structured`
  - `create-pr-natural-language`
  - `publish-pr`
  - `update-pr-content`
  - `update-pr-status`
  - `get-community-pr-detail`
- to `pr-anchor`:
  - `confirm-slot`
  - `check-in`
  - `recommend-alternative-batches`
  - `accept-alternative-batch`
  - `expand-full-anchor-pr`
  - `get-anchor-pr-detail`
  - `get-anchor-pr-economy`
- keep in `pr-core`:
  - join
  - exit
  - shared summaries
  - shared temporal refresh
  - slot management

#### Step 2.3 Scenario Rule Split

Refactor temporal and partner-action logic so Anchor-only rules no longer run for Community PR.

Required changes:

- `joinPR` loads scenario rules from `prKind`
- `confirmSlot` asserts `prKind === "ANCHOR"`
- `checkIn` asserts `prKind === "ANCHOR"`
- temporal refresh skips confirm/check-in time-window logic for Community PR

Pseudo-code:

```ts
function getScenarioBehavior(prKind: PRKind) {
  if (prKind === "ANCHOR") {
    return {
      supportsConfirm: true,
      supportsCheckIn: true,
      autoConfirmWindow: true,
      autoReleaseUnconfirmed: true,
      joinLockWindow: true,
    };
  }

  return {
    supportsConfirm: false,
    supportsCheckIn: false,
    autoConfirmWindow: false,
    autoReleaseUnconfirmed: false,
    joinLockWindow: false,
  };
}
```

#### Step 2.4 Read Model Split

Implement:

- `getCommunityPRDetail(id, viewerOpenId?)`
- `getAnchorPRDetail(id, viewerOpenId?)`
- `getAnchorPREconomy(id, viewerOpenId)`

Both assemble from:

- root row
- subtype row
- shared partner data

#### Step 2.5 Controller Split

Implement direct route groups:

- `/api/pr`
  - join
  - exit
  - mine created/joined
- `/api/cpr`
  - create
  - create natural language
  - detail
  - publish
  - content update
  - status update
- `/api/apr`
  - detail
  - confirm
  - check-in
  - economy
  - alternative batches
  - accept alternative batch

Remove:

- generic PR detail create/edit endpoints from the main route surface

### Completion Criteria

- no business logic depends on mixed root-table Anchor columns
- Community confirm/check-in is impossible at controller and use-case layers
- direct `cpr` and `apr` API surfaces exist

## Workstream 3: Frontend Route, Query, and Type Split

### Goal

Make the frontend consume direct scenario APIs and routes before rebuilding the page/component tree.

### Files

- `apps/frontend/src/router/index.ts`
- `apps/frontend/src/entities/pr/types.ts`
- new:
  - `apps/frontend/src/entities/pr/routes.ts`
  - `apps/frontend/src/entities/pr/formatters.ts`
  - `apps/frontend/src/entities/apr/presenters.ts`
  - `apps/frontend/src/entities/cpr/presenters.ts`
- `apps/frontend/src/queries/**/*`
- `apps/frontend/src/features/pr-create/usePRCreateFlow.ts`
- `apps/frontend/src/pages/MyPRsPage.vue`

### Steps

#### Step 3.1 Route Helpers

Add route helpers:

```ts
export const toCommunityPRPath = (id: number) => `/cpr/${id}`;
export const toAnchorPRPath = (id: number) => `/apr/${id}`;
export const toAnchorPREconomyPath = (id: number) => `/apr/${id}/economy`;
```

#### Step 3.2 Route Table

Replace routes:

- add `/cpr/new`
- add `/cpr/:id`
- add `/apr/:id`
- add `/apr/:id/economy`

Remove:

- `/pr/new`
- `/pr/:id`
- `/pr/:id/economy`

Keep:

- `/pr/mine`

#### Step 3.3 Query Split

Create direct queries:

- `useCommunityPR`
- `useAnchorPR`
- `useAnchorPREconomy`
- `useCreateCommunityPRStructured`
- `useCreateCommunityPRFromNaturalLanguage`
- `usePublishCommunityPR`
- `useUpdateCommunityPRContent`
- `useUpdateCommunityPRStatus`
- `useConfirmAnchorPR`
- `useCheckInAnchorPR`

Retire:

- generic `usePR`
- generic confirm/check-in hooks under generic PR naming

#### Step 3.4 Summary Navigation

Update `/pr/mine` summary consumption to use:

- `prKind`
- `canonicalPath`

Pseudo-code:

```ts
const goToPR = (item: PRSummaryItem) => {
  router.push(item.canonicalPath);
};
```

#### Step 3.5 Create Flow Split

Replace `usePRCreateFlow` with `useCommunityPRCreateFlow`.

Rules:

- create APIs point to `/api/cpr`
- success navigation points to `/cpr/:id`
- analytics still records `prKind: "COMMUNITY"`

### Completion Criteria

- router has only canonical `cpr/apr` PR routes
- frontend no longer queries generic PR detail
- Community create flow points directly to Community routes/APIs

## Workstream 4: Frontend Page and Component Refactor

### Goal

Eliminate semantic mixing and clarify the page/component hierarchy.

### Files

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/pages/PRCreatePage.vue`
- `apps/frontend/src/pages/PREconomyPage.vue`
- `apps/frontend/src/components/pr/*`
- `apps/frontend/src/widgets/pr/*`
- `apps/frontend/src/features/pr-actions/usePRActions.ts`

### Target Structure

#### Pages

- `CommunityPRPage.vue`
- `CommunityPRCreatePage.vue`
- `AnchorPRPage.vue`
- `AnchorPREconomyPage.vue`

#### Shared Components

- `PRHeroHeader.vue`
- `PRFactsCard.vue`
- `PRShareSection.vue`
- `PRLocationGalleryModal.vue`
- shared edit/status modals

#### Shared Shells / Containers

- `PRDetailShell.vue`
- `PRCreatorTools.vue`

#### Scenario Components

- `CommunityPRActionBar.vue`
- `AnchorPRActionBar.vue`
- `AnchorAttendanceActions.vue`
- `AnchorPREconomyEntryCard.vue`
- `AnchorPRBatchAlternatives.vue`
- `AnchorPRSameBatchList.vue`

#### Feature Composables

- `useSharedPRActions.ts`
- `useAnchorAttendanceActions.ts`
- `useCommunityPRViewModel.ts`
- `useAnchorPRViewModel.ts`

### Steps

#### Step 4.1 Rename and Extract Shared Presentation

1. Rename `PRCard.vue` to `PRFactsCard.vue`.
2. Move formatting helpers out of the component into presenter/formatter modules.
3. Keep the component prop-driven and style-scoped only.

#### Step 4.2 Replace Mixed Action Logic

Split current `usePRActions.ts` into:

- `useSharedPRActions`
  - join
  - exit
  - common capability booleans
- `useAnchorAttendanceActions`
  - confirm
  - prepare check-in
  - submit check-in

Then replace `PRActionsPanel.vue` with scenario action bars.

#### Step 4.3 Build Community Page

Compose:

- header
- facts card
- Community action bar
- share section
- creator tools

No confirm/check-in UI appears anywhere.

#### Step 4.4 Build Anchor Page

Compose:

- header
- facts card
- Anchor economy entry card
- Anchor action bar
- attendance action section
- same-batch list
- alternative-batch section
- share section
- creator tools

#### Step 4.5 Build Anchor Economy Page

Move economy display out of the old generic page and consume `useAnchorPREconomy`.

#### Step 4.6 Remove Mixed Pages

After scenario pages are wired:

- remove old `PRPage.vue`
- remove old `PRCreatePage.vue`
- remove old `PREconomyPage.vue`

### Data / Style Separation Enforcement

For every new page:

- no direct formatting helpers inside template-heavy files
- no query hook imports inside low-level presentational components
- no giant page SFC that owns route params, all queries, formatting, modal state, and business rules at once

Review rule during implementation:

- if a file owns route parsing + queries + presenters + actions + section visibility + styles, split it

### Completion Criteria

- shared vs scenario UI boundaries are explicit
- confirm/check-in code exists only in Anchor-specific files
- component naming is semantic and unambiguous

## Workstream 5: Documentation and Verification

### Goal

Align code and product docs, then verify build and core flows.

### Files

- `docs/product/overview.md`
- `docs/product/glossary.md`
- `docs/product/features/find-partner.md`
- `docs/task/split-anchor-community-pr/RESULT.md`

### Build Checks

Run:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm build`

If a separate drizzle step is needed during implementation:

- `pnpm db:generate`

### Manual Smoke Checks

#### Community

1. Open `/cpr/new`
2. Create draft via structured flow
3. Publish
4. Land on `/cpr/:id`
5. Verify only join/exit actions exist
6. Verify no confirm/check-in UI

#### Anchor

1. Open Anchor event flow
2. Open an Anchor PR at `/apr/:id`
3. Verify join/exit actions
4. Verify confirm/check-in appear only when eligible
5. Verify economy page at `/apr/:id/economy`

#### Shared

1. Open `/pr/mine`
2. Verify Community items link to `/cpr/:id`
3. Verify Anchor items link to `/apr/:id`

## Implementation Boundaries

### Not in This Implementation

- manual Anchor PR creation
- economy domain extraction beyond the subtype boundary
- polymorphic Partner references
- compatibility redirects for old `/pr/:id` detail/create URLs

### Allowed Simplifications

- keep shared `Partner.status` enum as-is
- keep some shared formatting utilities in `entities/pr` if fully generic
- keep event-plaza / anchor-event discovery routes unchanged if their existing paths are acceptable

## Final Execution Sequence

1. add subtype entities and migrations
2. split repositories
3. split backend domains and controllers
4. update backend exports and build
5. split frontend routes and queries
6. build new scenario pages and action bars
7. remove old mixed pages/components
8. update docs
9. run build/typecheck and smoke-test flows

## Approval Gate for Implementation

Implementation should begin only if you approve this L3 sequence, especially:

- direct cutover to `/cpr` and `/apr` with no compatibility layer
- removal of generic PR detail/create pages
- backend-first split before frontend cutover
- explicit frontend component refactor as part of the same task
