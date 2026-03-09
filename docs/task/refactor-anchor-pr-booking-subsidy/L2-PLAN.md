# L2 Plan: Low-Level Design for Anchor PR Booking / Support Refactor

## 1. Adjusted L1 Decisions After Review

Your review changes two important parts of the design:

1. Support resources must be defined upstream of Anchor PR, because Anchor PR is created from `Anchor Event + Batch + chosen location`.
2. Non-cash support should stay lightweight:
   - structured enough to generate summary + detailed rules;
   - not treated as a strongly normalized/searchable product catalog;
   - not required to render identically across all scenarios forever.
3. This refactor uses a reset-only schema strategy:
   - no backfill;
   - no compatibility layer;
   - existing migration history may be removed;
   - the target schema is defined only by the new post-refactor state.
4. Because Event/Batch-level support editing is non-trivial, the MVP should include a simple admin page protected by an environment-variable password.

This leads to a template-and-snapshot design instead of a PR-only resource design.

## 2. Target Storage Model

## 2.1 Keep existing subtype table focused

Keep `anchor_partner_requests` only for:

- `prId`
- `anchorEventId`
- `batchId`
- `visibilityStatus`
- `autoHideAt`

Legacy support/economy columns stop being read by the new flow:

- `resourceBookingDeadlineAt`
- `paymentModelApplied`
- `discountRateApplied`
- `subsidyCapApplied`
- `cancellationPolicyApplied`
- `economicPolicyScopeApplied`
- `economicPolicyVersionApplied`

Under the reset-only schema strategy, these legacy columns should be removed from the target schema instead of being carried forward.

## 2.2 New table: Event-level support resource templates

File target:

- `apps/backend/src/entities/anchor-event-support-resource.ts`

Table:

- `anchor_event_support_resources`

Purpose:

- define support resources at the Anchor Event level;
- make them inheritable by lazily created batches and auto-created PRs;
- support location-pool-like applicability.

Columns:

- `id bigint pk`
- `anchor_event_id bigint not null`
- `code text not null`
  - stable identifier within one event, used by batch overrides and migration
- `title text not null`
  - example: `场地费用`, `羽毛球`, `能量饮料`, `桌面时钟`
- `resource_kind text not null`
  - enum: `VENUE | ITEM | SERVICE | OTHER`
- `applies_to_all_locations boolean not null default true`
- `location_ids text[] not null default []`
  - empty unless `applies_to_all_locations = false`
- `booking_required boolean not null default false`
- `booking_handled_by text`
  - enum: `PLATFORM | USER | null`
- `booking_deadline_rule text`
  - same relative/absolute rule format already used today
- `booking_locks_participant boolean not null default false`
  - whether this resource contributes to Anchor PR locking/release/exit rules
- `cancellation_policy text`
- `settlement_mode text not null default 'NONE'`
  - enum: `NONE | PLATFORM_PREPAID | PLATFORM_POSTPAID`
- `subsidy_rate double precision`
- `subsidy_cap integer`
- `requires_user_transfer_to_platform boolean not null default false`
- `summary_text text not null`
  - short user-facing support statement
- `detail_rules text[] not null default []`
  - human-readable detailed rule lines
- `display_order integer not null default 0`
- `created_at timestamp not null default now()`

Constraints:

- unique `(anchor_event_id, code)`
- if `booking_required = false`, then `booking_handled_by` and `booking_deadline_rule` should be null
- if `settlement_mode = 'NONE'`, then `subsidy_rate`, `subsidy_cap`, and `requires_user_transfer_to_platform` should normally be null/false
- if `requires_user_transfer_to_platform = true`, settlement must be `PLATFORM_PREPAID`

## 2.3 New table: Batch-level support overrides

File target:

- `apps/backend/src/entities/anchor-event-batch-support-override.ts`

Table:

- `anchor_event_batch_support_overrides`

Purpose:

- provide the time-window side of the inheritance mechanism;
- preserve the current “batch override” idea in a cleaner form;
- avoid encoding ad-hoc time-window selectors directly on event resource templates.

Columns:

- `id bigint pk`
- `batch_id bigint not null`
- `event_support_resource_id bigint not null`
- `disabled boolean not null default false`
- `booking_deadline_rule_override text`
- `booking_locks_participant_override boolean`
- `cancellation_policy_override text`
- `settlement_mode_override text`
  - enum: `NONE | PLATFORM_PREPAID | PLATFORM_POSTPAID | null`
- `subsidy_rate_override double precision`
- `subsidy_cap_override integer`
- `requires_user_transfer_to_platform_override boolean`
- `summary_text_override text`
- `detail_rules_override text[]`
- `display_order_override integer`
- `created_at timestamp not null default now()`

Constraints:

- unique `(batch_id, event_support_resource_id)`

Reasoning:

- location applicability belongs to the event template layer;
- time-window specialization belongs to the batch layer;
- this maps directly to the current Event -> Batch -> PR creation flow.

## 2.4 New table: PR-level resolved support snapshots

File target:

- `apps/backend/src/entities/anchor-pr-support-resource.ts`

Table:

- `anchor_pr_support_resources`

Purpose:

- freeze the support state visible to a specific Anchor PR;
- keep PR behavior stable even if the event template changes later;
- let read models and lifecycle logic read one resolved source of truth.

Columns:

- `id bigint pk`
- `pr_id bigint not null`
- `source_event_support_resource_id bigint`
- `source_batch_support_override_id bigint`
- `title text not null`
- `resource_kind text not null`
- `booking_required boolean not null`
- `booking_handled_by text`
  - enum: `PLATFORM | USER | null`
- `booking_deadline_at timestamp`
- `booking_locks_participant boolean not null default false`
- `cancellation_policy text`
- `settlement_mode text not null default 'NONE'`
  - enum: `NONE | PLATFORM_PREPAID | PLATFORM_POSTPAID`
- `subsidy_rate double precision`
- `subsidy_cap integer`
- `requires_user_transfer_to_platform boolean not null default false`
- `summary_text text not null`
- `detail_rules text[] not null default []`
- `display_order integer not null default 0`
- `created_at timestamp not null default now()`

Constraints:

- index on `(pr_id, display_order, id)`
- foreign key `pr_id -> partner_requests.id on delete cascade`

Important:

- non-cash support stays lightweight here;
- it is just another resolved support row with `settlement_mode = 'NONE'` and human-readable summary/rules.

## 3. Repository and Domain Boundaries

New repositories:

- `AnchorEventSupportResourceRepository`
- `AnchorEventBatchSupportOverrideRepository`
- `AnchorPRSupportResourceRepository`

New backend domain:

- `apps/backend/src/domains/pr-booking-support`

Sub-responsibilities:

1. template resolution
2. PR snapshot materialization
3. booking-support preview/read model assembly
4. effective booking deadline lookup for lifecycle rules

New domain services:

- `resolve-support-resource-templates.ts`
- `materialize-pr-support-resources.ts`
- `build-booking-support-preview.ts`
- `get-effective-booking-deadline.ts`

## 4. Resolution Algorithm

## 4.1 Resolve support resources for a new Anchor PR

Inputs:

- `anchorEventId`
- `batchId`
- chosen `location`
- chosen `timeWindow`

Algorithm:

1. Load all `anchor_event_support_resources` for the event.
2. Keep only templates whose location scope matches the chosen PR location:
   - `applies_to_all_locations = true`, or
   - `location_ids` contains the PR location id/string.
3. Load all `anchor_event_batch_support_overrides` for the batch.
4. For each surviving event support template:
   - find its batch override by `event_support_resource_id`;
   - skip if override exists and `disabled = true`;
   - resolve final fields by override-first, template-second;
   - resolve `booking_deadline_at` from the final `booking_deadline_rule` and PR time window;
   - create one `anchor_pr_support_resources` row.
5. Sort by resolved `display_order`.

## 4.2 Resolution precedence

For one support row:

1. batch override
2. event template

This applies to:

- summary text
- detail rules
- booking policy
- settlement mode
- subsidy numbers
- lifecycle-lock flag
- display order

## 4.3 Effective booking deadline for PR lifecycle

Algorithm:

1. Read all `anchor_pr_support_resources` for the PR.
2. Filter rows where:
   - `booking_required = true`
   - `booking_locks_participant = true`
   - `booking_deadline_at != null`
3. Effective booking deadline is the earliest `booking_deadline_at` among them.
4. If there are no such rows, effective booking deadline is `null`.

This effective deadline replaces the old single `anchor_partner_requests.resource_booking_deadline_at` as the lifecycle input for:

- `refreshTemporalStatus`
- booking-deadline-based auto release
- post-deadline exit restriction for confirmed/attended slots

## 5. Creation and Auto-Creation Integration

The following flows must call the same support materialization service:

- initial Anchor PR generation from Event/Batch
- `expandFullAnchorPR`
- `acceptAlternativeBatch`

That keeps support resolution consistent across:

- manually seeded Anchor PRs
- lazily created same-batch PRs
- lazily created alternative-batch PRs

## 6. Enum and Type Changes

## 6.1 Remove old API-facing meaning of payment model

Legacy enum to retire from the new read path:

- `PaymentModel = 'A' | 'C'`

New enum:

```ts
type SupportSettlementMode =
  | "NONE"
  | "PLATFORM_PREPAID"
  | "PLATFORM_POSTPAID";
```

New booking handler enum:

```ts
type BookingHandledBy = "PLATFORM" | "USER" | null;
```

New resource kind enum:

```ts
type SupportResourceKind = "VENUE" | "ITEM" | "SERVICE" | "OTHER";
```

## 6.2 Preview shape for Anchor PR detail

`GET /api/apr/:id`

Replace current:

- `anchor.economyPreview`

With:

```ts
anchor: {
  anchorEventId: number;
  batchId: number;
  visibilityStatus: "VISIBLE" | "HIDDEN";
  autoHideAt: string | null;
  attendance: { ... };
  bookingSupportPreview: {
    headline: string | null;
    highlights: string[];
    effectiveBookingDeadlineAt: string | null;
  };
  related: { ... };
}
```

Preview generation:

- `headline`: join top-priority support summaries into one primary sentence
- `highlights`: ordered short support summaries, capped for the detail-card preview
- `effectiveBookingDeadlineAt`: computed via resolved PR support rows

## 6.3 Detailed page API shape

Rename route:

- `GET /api/apr/:id/booking-support`

Response:

```ts
type AnchorPRBookingSupportDetail = {
  prId: number;
  status: PRStatus;
  anchorEventId: number;
  batchId: number;
  bookingSupport: {
    overview: {
      title: string;
      headline: string | null;
      highlights: string[];
      effectiveBookingDeadlineAt: string | null;
    };
    resources: Array<{
      id: number;
      title: string;
      resourceKind: SupportResourceKind;
      summaryText: string;
      detailRules: string[];
      booking: {
        required: boolean;
        handledBy: BookingHandledBy;
        deadlineAt: string | null;
        locksParticipant: boolean;
        cancellationPolicy: string | null;
      };
      support: {
        settlementMode: SupportSettlementMode;
        subsidyRate: number | null;
        subsidyCap: number | null;
        requiresUserTransferToPlatform: boolean;
      };
    }>;
  };
};
```

Why resource-centric detail:

- resource is the base entity;
- booking and support are facets of that resource;
- the frontend can render one generic section per resource without hardcoding `Model A / Model C`.

## 6.4 Reimbursement status read model

Keep route shape for now:

- `GET /api/apr/:id/reimbursement/status`

But change eligibility logic:

- no longer depend on `paymentModelApplied === 'A'`
- instead depend on whether the viewer has at least one resolved PR support row with:
  - `settlementMode = 'PLATFORM_POSTPAID'`
  - and the slot is `ATTENDED`
  - and PR is `CLOSED`

Reason:

- reimbursement is now derived from settlement mode, not from a legacy marketing label.

## 7. Frontend Boundaries

## 7.1 Route and naming

Rename:

- router path: `/apr/:id/booking-support`
- route name: `anchor-pr-booking-support`
- route helper: `anchorPRBookingSupportPath`
- query key: `anchorPR.bookingSupport`
- query hook: `useAnchorPRBookingSupport`
- page component: `AnchorPRBookingSupportPage.vue`

Delete obsolete frontend surface:

- `apps/frontend/src/pages/AnchorPREconomyPage.vue`
- `useAnchorPREconomy` duplicates
- economy-related query/type names

## 7.2 Page/component structure

Recommended frontend structure:

1. `AnchorPRPage.vue`
   - keep a small preview card
   - consume `bookingSupportPreview`

2. `AnchorPRBookingSupportPage.vue`
   - page header
   - overview card
   - resource cards
   - reimbursement/support explanation area

3. lightweight presentational helpers
   - `BookingSupportPreviewCard.vue`
   - `BookingSupportResourceCard.vue`

Do not over-componentize more than this in MVP.

## 7.3 UI rendering rules

Primary copy:

- render `headline`
- render ordered `highlights`

Secondary rule rendering:

- each resource card shows `summaryText`
- `detailRules` render as bullet-style text lines
- booking facts and subsidy numbers are shown as secondary facts, not hero copy

This satisfies the user requirement that the page should say things like:

- `场地费用全包，另外赠送羽毛球和饮品`

without throwing raw caps/ratios in the user’s face first.

## 8. Minimal Admin Surface

## 8.1 Goal

Provide a simple internal admin page to manage:

- event-level support resource templates
- batch-level support overrides

This avoids encoding a large amount of support-resource structure directly in SQL seeds or manual database edits.

## 8.2 Auth model

Use one environment variable on the backend:

- `ADMIN_PAGE_PASSWORD`

Recommended backend behavior:

- add `ADMIN_PAGE_PASSWORD` to `apps/backend/src/lib/env.ts`
- expose a tiny admin auth flow based on password verification
- return a short-lived admin session token or signed cookie

Recommended scope for MVP:

- dedicated admin-only backend routes under `/api/admin/*`
- no user/account integration
- no role system
- no persistence of admin identities

Reason:

- the user explicitly requested a simple admin page;
- introducing a full operator identity system now would be disproportionate.

## 8.3 Admin backend routes

Recommended routes:

- `POST /api/admin/session`
  - body: `{ password: string }`
  - verifies against `ADMIN_PAGE_PASSWORD`
- `GET /api/admin/events/:eventId/booking-support-resources`
  - returns event templates + batch overrides
- `PUT /api/admin/events/:eventId/booking-support-resources`
  - replace event template list
- `PUT /api/admin/batches/:batchId/booking-support-overrides`
  - replace override list for one batch

Replace-style writes are recommended over many tiny mutation endpoints because:

- support config is edited as a structured document;
- it keeps the admin API smaller;
- it reduces controller/use-case surface for MVP.

## 8.4 Admin frontend route

Recommended frontend route:

- `/admin/booking-support`

Recommended page behavior:

1. password gate
2. event selector
3. event-level support resource editor
4. batch selector within the chosen event
5. batch override editor
6. save buttons for event templates and batch overrides

Recommended editor UX:

- simple form-list editing
- reorder by list order
- textarea for `detailRules` as one-line-per-rule
- toggle-based controls for booking requirement, settlement mode, transfer-to-platform flag

No need for polished admin design in MVP.

## 8.5 Admin data model in frontend

The admin page should edit the same backend structures defined in this L2 plan:

- event template rows
- batch override rows

It should not invent a separate frontend-only draft format beyond minimal form-state convenience.

## 9. Reset-Only Schema Strategy

This task now assumes existing databases are disposable.

So implementation should:

1. remove existing old migration files
2. generate a new clean schema representing only the new target state
3. update seeds directly to the new support-resource model
4. remove all code paths that depend on legacy economy columns and `Model A / Model C`

Seed data for active demo events should be rewritten explicitly, for example:

- badminton:
  - `场地费用`
  - `羽毛球`
  - `能量饮料`
- study sprint:
  - `桌面时钟`

Because there is no backfill, old legacy fields do not need semantic mapping rules in implementation.

## 10. Concrete File/Module Plan

Backend new files:

- `apps/backend/src/entities/anchor-event-support-resource.ts`
- `apps/backend/src/entities/anchor-event-batch-support-override.ts`
- `apps/backend/src/entities/anchor-pr-support-resource.ts`
- `apps/backend/src/repositories/AnchorEventSupportResourceRepository.ts`
- `apps/backend/src/repositories/AnchorEventBatchSupportOverrideRepository.ts`
- `apps/backend/src/repositories/AnchorPRSupportResourceRepository.ts`
- `apps/backend/src/domains/pr-booking-support/**/*`
- admin auth/use-case/controller files under backend auth/controller/domain boundaries

Backend modified files:

- `apps/backend/src/lib/env.ts`
- `apps/backend/src/entities/anchor-event.ts`
- `apps/backend/src/entities/anchor-event-batch.ts`
- `apps/backend/src/entities/anchor-partner-request.ts`
- `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts`
- `apps/backend/src/domains/pr-core/temporal-refresh.ts`
- `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/controllers/anchor-pr.controller.ts`
- backend route/type exports

Frontend modified/new files:

- `apps/frontend/src/router/index.ts`
- `apps/frontend/src/entities/pr/routes.ts`
- `apps/frontend/src/shared/api/query-keys.ts`
- `apps/frontend/src/queries/useAnchorPR.ts`
- `apps/frontend/src/pages/AnchorPRPage.vue`
- `apps/frontend/src/pages/AnchorPRBookingSupportPage.vue`
- `apps/frontend/src/pages/AdminBookingSupportPage.vue`
- `apps/frontend/src/components` or `widgets` support preview/resource cards
- `apps/frontend/src/locales/zh-CN.jsonc`

Docs later:

- `docs/product/overview.md`
- `docs/product/glossary.md`

## 11. Approval Gate for L3

If you approve this L2, I will turn it into L3 with:

- step-by-step migration ordering
- exact pseudo-code per backend service/use-case
- frontend implementation sequence
- build verification plan

One L2 recommendation to confirm:

- I recommend making the admin page write full replacement payloads for event templates and batch overrides, instead of adding many per-row CRUD endpoints, because it is much smaller and easier to maintain in MVP.
