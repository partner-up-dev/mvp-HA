# L2 Plan: Low-Level Design for Anchor PR / Community PR Split

## Stage Goal

Translate the approved L1 architecture into concrete low-level design:

- tables
- response shapes
- controller/module boundaries
- route contracts
- frontend page/component decomposition
- migration and compatibility mechanics

This stage is intentionally detailed enough to drive implementation without reopening architecture.

## Confirmed Design Constraints

- `partner_requests` remains the shared root identity table
- `partners.prId -> partner_requests.id` remains unchanged
- Community PR supports `join/exit` only
- Anchor PR supports `join/exit/confirm/check-in`
- canonical shareable routes become short:
  - `/cpr/...`
  - `/apr/...`
- frontend PR refactor is in scope, not deferred

## 1. Data Model

### 1.1 Root Table: `partner_requests`

Keep these columns on the shared root table:

- `id`
- `pr_kind`
- `created_at`
- `created_by`
- `type`
- `status`
- `title`
- `time_window`
- `location`
- `min_partners`
- `max_partners`
- `preferences`
- `notes`
- `xiaohongshu_poster`
- `wechat_thumbnail`

Reason:

- these are already shared display/lifecycle fields
- both Anchor and Community pages need them
- moving them now would add churn without improving the subtype boundary

### 1.2 Anchor Subtype Table: `anchor_partner_requests`

Create:

- `pr_id bigint primary key references partner_requests(id) on delete cascade`
- `anchor_event_id bigint not null references anchor_events(id) on delete cascade`
- `batch_id bigint not null references anchor_event_batches(id) on delete cascade`
- `visibility_status text not null default 'VISIBLE'`
- `auto_hide_at timestamp null`
- `resource_booking_deadline_at timestamp null`
- `payment_model_applied text null`
- `discount_rate_applied double precision null`
- `subsidy_cap_applied integer null`
- `cancellation_policy_applied text null`
- `economic_policy_scope_applied text null`
- `economic_policy_version_applied integer null`

Notes:

- `anchor_event_id` and `batch_id` become required for Anchor subtype rows
- this restores stronger Anchor-specific FK guarantees than the current nullable mixed-table design

### 1.3 Community Subtype Table: `community_partner_requests`

Create:

- `pr_id bigint primary key references partner_requests(id) on delete cascade`
- `raw_text`
- `budget`
- `creation_source text not null`

`creation_source` enum values:

- `STRUCTURED`
- `NATURAL_LANGUAGE`

Reason:

- gives Community a meaningful current-only field immediately
- avoids a “marker table only” smell
- preserves a future home for Community-only fields without forcing premature schema invention

### 1.4 Existing Shared Table: `partners`

Keep unchanged in phase 1:

- FK target remains `partner_requests.id`
- status enum remains shared for now:
  - `JOINED`
  - `CONFIRMED`
  - `RELEASED`
  - `ATTENDED`

Scenario rule:

- Community PR may only use `JOINED` and `RELEASED`
- Anchor PR may use all current statuses

This preserves storage compatibility while moving semantic rules to application code.

## 2. Read Models and Types

### 2.1 Shared Summary Type

Replace current generic summary usage with:

```ts
type PRSummaryItem = {
  id: number;
  prKind: "ANCHOR" | "COMMUNITY";
  canonicalPath: string;
  status: PRStatus;
  minPartners: number | null;
  maxPartners: number | null;
  partners: number[];
  createdAt: string;
  title?: string;
  type: string;
};
```

`/pr/mine` uses `canonicalPath` instead of hardcoding `/pr/${id}`.

### 2.2 Detail Types

Define three boundary types:

```ts
type BasePRDetail = {
  id: number;
  prKind: "ANCHOR" | "COMMUNITY";
  title?: string;
  rawText: string;
  status: PRStatus;
  createdAt: string;
  createdBy?: string | null;
  core: {
    type: string;
    time: [string | null, string | null];
    location: string | null;
    minPartners: number | null;
    maxPartners: number | null;
    partners: number[];
    myPartnerId: number | null;
    budget: string | null;
    preferences: string[];
    notes: string | null;
  };
  share: {
    xiaohongshuPoster?: XhsPosterSnapshot | null;
    wechatThumbnail?: WechatThumbnailSnapshot | null;
  };
};

type CommunityPRDetail = BasePRDetail & {
  prKind: "COMMUNITY";
  community: {
    creationSource: "STRUCTURED" | "NATURAL_LANGUAGE" | "LEGACY";
    supportsConfirm: false;
    supportsCheckIn: false;
  };
};

type AnchorPRDetail = BasePRDetail & {
  prKind: "ANCHOR";
  anchor: {
    anchorEventId: number;
    batchId: number;
    visibilityStatus: "VISIBLE" | "HIDDEN";
    autoHideAt: string | null;
    attendance: {
      supportsConfirm: true;
      supportsCheckIn: true;
    };
    economyPreview: {
      resourceBookingDeadlineAt: string | null;
      paymentModelApplied: "A" | "C" | null;
      discountRateApplied: number | null;
      subsidyCapApplied: number | null;
      cancellationPolicyApplied: string | null;
      economicPolicyScopeApplied: "EVENT_DEFAULT" | "BATCH_OVERRIDE" | null;
      economicPolicyVersionApplied: number | null;
    };
    related: {
      sameBatchAlternatives: Array<{
        id: number;
        location: string;
        status: PRStatus;
      }>;
      alternativeBatches: Array<{
        batchId: number | null;
        timeWindow: [string | null, string | null];
        location: string;
        hasJoinablePr: boolean;
        joinablePrId: number | null;
        createOnAccept: boolean;
      }>;
    };
  };
};
```

Rule:

- templates consume nested scenario objects
- no more flat optional-heavy detail object as the primary contract

## 3. Backend Module and Controller Layout

### 3.1 Entities

Add:

- `src/entities/anchor-partner-request.ts`
- `src/entities/community-partner-request.ts`

Keep:

- `src/entities/partner-request.ts` as root schema and shared types

### 3.2 Repositories

Split current `PartnerRequestRepository` responsibilities into:

- `PRRootRepository`
- `AnchorPRRepository`
- `CommunityPRRepository`

Responsibilities:

`PRRootRepository`

- create/update/find root row
- shared list/find-by-id

`AnchorPRRepository`

- read/write Anchor subtype row
- find by event/batch/location
- visibility updates

`CommunityPRRepository`

- create/read/update Community subtype row
- read `creationSource`

### 3.3 Domains

`domains/pr-core`

- shared lifecycle/status logic
- shared Partner slot management
- shared join/exit
- shared route meta / summary assembly

`domains/pr-anchor`

- detail read model
- confirm
- check-in
- alternative-batch recommendation
- accept-alternative-batch
- full-anchor expansion
- economy preview assembly

`domains/pr-community`

- structured create
- natural-language create
- publish
- content update
- status update
- detail read model

### 3.4 Controllers / API Surface

#### Shared Root

`/api/pr`

- `POST /api/pr/:id/join`
- `POST /api/pr/:id/exit`
- `GET /api/pr/mine/created`
- `GET /api/pr/mine/joined`

#### Community

`/api/cpr`

- `POST /api/cpr`
- `POST /api/cpr/natural-language`
- `GET /api/cpr/:id`
- `POST /api/cpr/:id/publish`
- `PATCH /api/cpr/:id/content`
- `PATCH /api/cpr/:id/status`

#### Anchor

`/api/apr`

- `GET /api/apr/:id`
- `POST /api/apr/:id/confirm`
- `POST /api/apr/:id/check-in`
- `GET /api/apr/:id/economy`
- `GET /api/apr/:id/alternative-batches`
- `POST /api/apr/:id/accept-alternative-batch`

## 4. Scenario Behavior Rules

### 4.1 Shared Actions

Available for both:

- join
- exit

### 4.2 Community-Only Rules

- no confirm action
- no check-in action
- no confirm deadline auto-release behavior
- no T-1h/T-30min confirmation-window logic

### 4.3 Anchor-Only Rules

- confirm action available
- check-in action available
- T-1h unconfirmed auto-release
- T-1h ~ T-30min auto-confirm-on-join
- T-30min join lock
- reimbursement/economy preview
- same-batch and alternative-batch behaviors

### 4.4 Shared Join Algorithm

Refactor `joinPR` into shared entry plus scenario rules:

```ts
joinPR(prId, openId):
  root = loadRoot(prId)
  refreshTemporalState(root)
  user = resolveUser(openId)
  ensureJoinableStatus(root)
  scenarioRules = loadScenarioJoinRules(root.prKind)
  scenarioRules.assertJoinAllowed(root)
  assignOrCreateSharedPartnerSlot()
  if root.prKind === "ANCHOR":
    maybeAutoConfirmAssignedSlot()
    maybeExpandFullAnchorPR()
  recalculateSharedPRStatus()
  return scenarioSpecificPublicView()
```

### 4.5 Confirm Algorithm

```ts
confirmAnchorPR(prId, openId):
  root = loadRoot(prId)
  assert root.prKind === "ANCHOR"
  refreshTemporalState(root)
  slot = findActivePartnerSlot(prId, userId)
  if slot.status === "JOINED":
    markConfirmed(slot)
  return anchorDetail(prId, viewer)
```

### 4.6 Check-In Algorithm

```ts
checkInAnchorPR(prId, openId, payload):
  root = loadRoot(prId)
  assert root.prKind === "ANCHOR"
  refreshTemporalState(root)
  assert eventStarted(root.time)
  slot = findActivePartnerSlot(prId, userId)
  reportCheckIn(slot, payload)
  return anchorDetail(prId, viewer)
```

### 4.7 Temporal Refresh Split

Refactor temporal refresh into:

- shared refresh:
  - expired transition
  - active transition
  - capacity/status recalculation
- Anchor-only refresh:
  - release unconfirmed slots
  - confirm/join lock windows

Community refresh skips Anchor attendance mechanics entirely.

## 5. Frontend Route Design

### 5.1 Canonical Routes

- `GET /cpr/new` -> Community create page
- `GET /cpr/:id` -> Community detail page
- `GET /apr/:id` -> Anchor detail page
- `GET /apr/:id/economy` -> Anchor economy page
- `GET /pr/mine` -> shared “my PRs” page

## 6. Frontend Query and Feature Split

### 6.1 Queries

Shared:

- `useJoinPR`
- `useExitPR`
- `useMyCreatedPRs`
- `useMyJoinedPRs`

Community:

- `useCommunityPR`
- `useCreateCommunityPRStructured`
- `useCreateCommunityPRFromNaturalLanguage`
- `usePublishCommunityPR`
- `useUpdateCommunityPRContent`
- `useUpdateCommunityPRStatus`

Anchor:

- `useAnchorPR`
- `useConfirmAnchorPR`
- `useCheckInAnchorPR`
- `useAnchorPRAlternativeBatches`
- `useAcceptAnchorPRAlternativeBatch`
- `useAnchorPREconomy`

### 6.2 Features

Shared:

- `features/pr-route/usePRCanonicalRoute`
- `features/pr-actions/useSharedPRActions`

Community:

- `features/cpr-create/useCommunityPRCreateFlow`
- `features/cpr-detail/useCommunityPRViewModel`

Anchor:

- `features/apr-detail/useAnchorPRViewModel`
- `features/apr-actions/useAnchorAttendanceActions`
- `features/apr-detail/useAnchorAlternatives`

## 7. Frontend Page and Component Refactor

## 7.1 Page Layer

Add:

- `pages/CommunityPRPage.vue`
- `pages/CommunityPRCreatePage.vue`
- `pages/AnchorPRPage.vue`
- `pages/AnchorPREconomyPage.vue`

Retire as primary entrypoints:

- `pages/PRPage.vue`
- `pages/PRCreatePage.vue`
- `pages/PREconomyPage.vue`

These may survive temporarily only as wrappers during migration.

## 7.2 Naming Cleanup

Rename ambiguous components:

- `PRCard.vue` -> `PRFactsCard.vue`
- `PRActionsPanel.vue` -> split, not extended

Introduce explicit scenario components:

- `SharedParticipationActions.vue`
- `AnchorAttendanceActions.vue`
- `CommunityPRActionBar.vue`
- `AnchorPRActionBar.vue`
- `AnchorPREconomyEntryCard.vue`
- `AnchorPRBatchAlternatives.vue`
- `AnchorPRSameBatchList.vue`

## 7.3 Shared vs Scenario Component Taxonomy

### Shared Presentational Components

- `PRHeroHeader`
- `PRFactsCard`
- `PRShareSection`
- `PRLocationGalleryModal`
- shared edit/status modals

### Shared Container / Shell Components

- `PRDetailShell`
- `PRDetailMetaBlock`
- `PRCreatorTools`

### Community Components

- `CommunityPRActionBar`
- `CommunityPRFormShell`
- `CommunityPRDetailSections`

### Anchor Components

- `AnchorPRActionBar`
- `AnchorAttendanceActions`
- `AnchorPREconomyEntryCard`
- `AnchorPRBatchAlternatives`
- `AnchorPRSameBatchList`

## 7.4 Data / Style Separation Rule

Low-level rule for the refactor:

- pages own route params and query orchestration only
- feature composables build view models
- presentational components receive plain props, no direct query hooks
- business formatting utilities move out of SFCs into dedicated presenter/formatter modules
- SCSS stays with presentational components, not mixed with data orchestration files

Example utility modules:

- `entities/pr/formatters.ts`
- `entities/pr/routes.ts`
- `entities/apr/presenters.ts`
- `entities/cpr/presenters.ts`

## 8. Specific File Move / Replacement Plan

### Backend

- split `controllers/partner-request.controller.ts`
  - keep shared root actions in `pr.controller.ts`
  - add `community-pr.controller.ts`
  - add `anchor-pr.controller.ts`

- split `domains/pr-core/use-cases`
  - move `create-pr-structured.ts` to `domains/pr-community/use-cases`
  - move `create-pr-natural-language.ts` to `domains/pr-community/use-cases`
  - move `publish-pr.ts` to `domains/pr-community/use-cases`
  - move `update-pr-content.ts` to `domains/pr-community/use-cases`
  - move `update-pr-status.ts` to `domains/pr-community/use-cases`
  - move `confirm-slot.ts` to `domains/pr-anchor/use-cases`
  - move `check-in.ts` to `domains/pr-anchor/use-cases`
  - move `recommend-alternative-batches.ts` to `domains/pr-anchor/use-cases`
  - move `accept-alternative-batch.ts` to `domains/pr-anchor/use-cases`
  - move `expand-full-anchor-pr.ts` to `domains/pr-anchor/use-cases`

### Frontend

- replace `PRPage.vue` with scenario pages plus legacy resolver
- replace `usePRActions.ts` with:
  - `useSharedPRActions.ts`
  - `useAnchorAttendanceActions.ts`
- replace `PRActionsPanel.vue` with scenario-specific action bars

## 9. Migration / Backfill Details

### 9.1 Schema Migration Order

1. create `anchor_partner_requests`
2. create `community_partner_requests`
3. backfill Anchor rows from `partner_requests where pr_kind = 'ANCHOR'`
4. backfill Community rows from `partner_requests where pr_kind = 'COMMUNITY'`
5. switch application writes
6. switch application reads
7. drop moved Anchor columns from root table last

### 9.2 Backfill Rules

Anchor:

- copy current Anchor-only columns from root to subtype row
- fail migration if `anchor_event_id` or `batch_id` is missing on an Anchor root row

Community:

- create subtype row for every Community root row
- set `creation_source = 'LEGACY'` for historical rows
- new writes set `STRUCTURED` or `NATURAL_LANGUAGE`

## 10. Test Design

### Backend Tests

- Community create -> writes root + community subtype
- Anchor read -> joins root + anchor subtype
- Community join/exit works
- Community confirm/check-in is rejected
- Anchor confirm/check-in works
- Anchor join auto-confirm window still works
- route-meta returns canonical `/cpr/:id` or `/apr/:id`
- migration/backfill preserves `partners.prId`

### Frontend Tests

- `/pr/mine` items navigate by `canonicalPath`
- Community page shows no confirm/check-in actions
- Anchor page shows confirm/check-in actions when eligible
- shared presentation components render identical shared sections for both scenarios

## 11. Approval Gate for L3

L3 should proceed only if you approve these low-level specifics:

- root table keeps shared content/lifecycle fields
- Anchor-only fields move to `anchor_partner_requests`
- Community subtype starts with `creation_source`
- `join/exit` stay shared; `confirm/check-in` become Anchor-only
- canonical short routes are:
  - `/cpr/new`
  - `/cpr/:id`
  - `/apr/:id`
  - `/apr/:id/economy`
- frontend component refactor includes naming cleanup and data/style separation, not just page splitting
