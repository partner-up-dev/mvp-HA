# L3 Plan: Implementation Plan for Anchor PR Booking / Support Refactor

## 1. Execution Strategy

Implementation should proceed in this order:

1. reset database schema source to the new model
2. add new entities/repositories for booking-support resources
3. add backend resolution/materialization/read-model services
4. switch Anchor PR creation and lifecycle logic to the new source of truth
5. rename Anchor PR route/API/page semantics from `economy` to `booking-support`
6. add the simple admin auth + admin page
7. rewrite seeds and docs
8. run build verification

Reason:

- schema and types must exist before services/controllers;
- lifecycle reads must move before old columns are removed from code;
- admin page depends on the final backend contract;
- frontend rename should happen after backend response shapes stabilize.

## 2. Reset-Only Schema Steps

## 2.1 Remove old migration history

Because reset-only was explicitly approved:

1. delete existing files under `apps/backend/drizzle/`
2. keep only the new generated schema artifacts representing the target state
3. keep seed files, but rewrite them to match the new schema

Implementation notes:

- remove the old generated SQL and snapshot files
- update any migration tooling assumptions only if deletion breaks local commands
- do not add backfill/data migration scripts

## 2.2 Reshape target schema

### `anchor_partner_requests`

Keep only:

- `pr_id`
- `anchor_event_id`
- `batch_id`
- `visibility_status`
- `auto_hide_at`

Remove:

- `resource_booking_deadline_at`
- `payment_model_applied`
- `discount_rate_applied`
- `subsidy_cap_applied`
- `cancellation_policy_applied`
- `economic_policy_scope_applied`
- `economic_policy_version_applied`

### `anchor_events`

Remove old direct economy fields:

- `payment_model`
- `discount_rate_default`
- `subsidy_cap_default`
- `resource_booking_deadline_rule`
- `cancellation_policy`

Reason:

- these move into event-level support resource templates;
- keeping both sources would hurt maintainability.

### `anchor_event_batches`

Remove old economy override fields:

- `discount_rate_override`
- `subsidy_cap_override`
- `economic_policy_version`

Reason:

- these become resource-specific batch overrides.

### Add new tables

- `anchor_event_support_resources`
- `anchor_event_batch_support_overrides`
- `anchor_pr_support_resources`

## 2.3 Regenerate schema artifacts

After entity updates:

1. run `pnpm db:generate`
2. inspect generated SQL for correctness
3. ensure reset path still works with `pnpm db:reset`

No legacy migration preservation is needed.

## 3. Backend Entity / Repository Implementation

## 3.1 New entity files

Create:

- `apps/backend/src/entities/anchor-event-support-resource.ts`
- `apps/backend/src/entities/anchor-event-batch-support-override.ts`
- `apps/backend/src/entities/anchor-pr-support-resource.ts`

Each file should provide:

- drizzle table
- zod select/insert schemas
- exported TypeScript types
- strict enums for:
  - `SupportSettlementMode`
  - `BookingHandledBy`
  - `SupportResourceKind`

Pseudo-code:

```ts
export const supportSettlementModeSchema = z.enum([
  "NONE",
  "PLATFORM_PREPAID",
  "PLATFORM_POSTPAID",
]);
```

## 3.2 Update entity exports

Modify:

- `apps/backend/src/entities/index.ts`

Add exports for the new entities and remove outdated type exports if no longer used.

## 3.3 New repositories

Create:

- `AnchorEventSupportResourceRepository`
- `AnchorEventBatchSupportOverrideRepository`
- `AnchorPRSupportResourceRepository`

Required methods:

### Event support resource repo

- `findByAnchorEventId(anchorEventId)`
- `replaceByAnchorEventId(anchorEventId, rows)`

### Batch override repo

- `findByBatchId(batchId)`
- `replaceByBatchId(batchId, rows)`

### PR support resource repo

- `findByPrId(prId)`
- `replaceByPrId(prId, rows)`
- `deleteByPrId(prId)`

Implementation rule:

- replacement methods should run in transactions
- replacement means delete existing rows for the owner and insert the new ordered set

## 4. Booking-Support Domain Implementation

Create:

- `apps/backend/src/domains/pr-booking-support/use-cases/*`
- `apps/backend/src/domains/pr-booking-support/services/*`
- `apps/backend/src/domains/pr-booking-support/index.ts`

## 4.1 Service: resolve support templates

File:

- `resolve-support-resource-templates.ts`

Responsibility:

- load event templates
- filter by location
- merge batch overrides
- resolve final rule fields

Pseudo-code:

```ts
resolveSupportTemplates({
  eventResources,
  batchOverrides,
  location,
  timeWindow,
}) => resolvedResources[]
```

Key rules:

- location mismatch excludes the template
- disabled batch override removes the template
- override fields win over event template fields
- deadline rule is converted to absolute `bookingDeadlineAt`

## 4.2 Service: materialize PR support resources

File:

- `materialize-pr-support-resources.ts`

Responsibility:

- call the resolver
- convert resolved resources into PR snapshot rows
- replace existing `anchor_pr_support_resources` for the PR

Pseudo-code:

```ts
await materializePRSupportResources({
  prId,
  anchorEventId,
  batchId,
  location,
  timeWindow,
});
```

## 4.3 Service: effective booking deadline

File:

- `get-effective-booking-deadline.ts`

Responsibility:

- load resolved PR support rows
- pick the earliest deadline among rows that lock participation

Pseudo-code:

```ts
const lockingDeadlines = rows
  .filter((row) => row.bookingRequired && row.bookingLocksParticipant)
  .map((row) => row.bookingDeadlineAt)
  .filter(notNull);

return lockingDeadlines.length > 0 ? min(lockingDeadlines) : null;
```

## 4.4 Service: preview builder

File:

- `build-booking-support-preview.ts`

Responsibility:

- convert resolved PR support rows into:
  - `headline`
  - `highlights`
  - `effectiveBookingDeadlineAt`

Heuristic:

- ordered by `displayOrder`
- use `summaryText` as source
- `headline` is either the first summary or a composed sentence from the first few compatible summaries

Keep the heuristic simple in MVP. Do not add LLM generation here.

## 4.5 Use-case: get Anchor PR booking-support detail

File:

- `get-anchor-pr-booking-support.ts`

Responsibility:

- validate Anchor PR exists
- load resolved PR support rows
- assemble `/booking-support` response

## 4.6 Use-case: get admin editable support config

File:

- `get-admin-booking-support-config.ts`

Responsibility:

- load event templates for one event
- load batches for that event
- load batch overrides for each batch
- return one admin-friendly payload

## 4.7 Use-case: replace event support templates

File:

- `replace-event-booking-support-resources.ts`

Responsibility:

- validate payload
- replace all event template rows for one event

## 4.8 Use-case: replace batch support overrides

File:

- `replace-batch-booking-support-overrides.ts`

Responsibility:

- validate payload
- replace override rows for one batch

## 5. Backend Flow Integration

## 5.1 Anchor PR detail read model

Modify:

- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`

Replace:

- `anchor.economyPreview`

With:

- `anchor.bookingSupportPreview`

Pseudo-code:

```ts
const supportRows = await prSupportRepo.findByPrId(id);
const preview = buildBookingSupportPreview(supportRows);
```

## 5.2 Rename detailed read endpoint

Modify:

- `apps/backend/src/controllers/anchor-pr.controller.ts`

Replace:

- `GET /:id/economy`

With:

- `GET /:id/booking-support`

Controller should call:

- `getAnchorPRBookingSupport(id)`

Also update backend barrel exports and RPC types automatically through the route change.

## 5.3 Rewire lifecycle refresh

Modify:

- `apps/backend/src/domains/pr-core/temporal-refresh.ts`

Replace old logic:

- read `resourceBookingDeadlineAt` from `anchor_partner_requests`

With new logic:

- read effective booking deadline from `anchor_pr_support_resources`

Pseudo-code:

```ts
const effectiveBookingDeadlineAt =
  request.prKind === "ANCHOR"
    ? await getEffectiveBookingDeadline(request.id)
    : null;
```

The rest of lock/release behavior stays unchanged.

## 5.4 Rewire exit restriction

Modify:

- `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`

Replace old anchor subtype deadline lookup with:

- `getEffectiveBookingDeadline(id)`

## 5.5 Rewire reimbursement status

Modify:

- `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`

Replace old `paymentModelApplied === "A"` condition with:

- resolved PR support rows contain at least one `PLATFORM_POSTPAID` support resource

Pseudo-code:

```ts
const supportRows = await prSupportRepo.findByPrId(id);
const supportsPostpaidSettlement = supportRows.some(
  (row) => row.settlementMode === "PLATFORM_POSTPAID",
);
```

Keep the rest of slot/PR status checks.

## 5.6 Rewire PR creation / auto-creation

Modify:

- `expand-full-anchor-pr.ts`
- `accept-alternative-batch.ts`
- any existing initial Anchor PR creation path used by seeds or system setup

After root PR + anchor subtype row creation:

- call `materializePRSupportResources(...)`

Pseudo-code:

```ts
await materializePRSupportResources({
  prId: createdRoot.id,
  anchorEventId,
  batchId,
  location: createdRoot.location,
  timeWindow: createdRoot.time,
});
```

Important:

- if location is null, fail fast for Anchor PR creation because support resolution depends on location scope.

## 5.7 Event detail payload stays mostly unchanged

Current event page lists batches and PRs only. Do not expand Event detail API with support config for user-facing pages during this refactor.

Reason:

- support configuration editing belongs to the admin surface;
- user-facing Event page does not need the extra payload yet.

## 6. Admin Auth Backend

## 6.1 Env schema

Modify:

- `apps/backend/src/lib/env.ts`

Add:

- `ADMIN_PAGE_PASSWORD: z.string().min(1).optional()`
- `ADMIN_SESSION_SECRET: z.string().min(16).default(...)`

I recommend a dedicated admin session secret instead of reusing user auth directly.

## 6.2 Admin auth model

Implement a minimal stateless signed token or short-lived cookie.

Recommended simpler path:

- signed bearer token in memory-free form, similar to existing auth token pattern

Files:

- `apps/backend/src/auth/admin-auth.ts`
- `apps/backend/src/auth/admin-middleware.ts`

Responsibilities:

- `createAdminToken()`
- `verifyAdminToken()`
- middleware that requires valid admin token

## 6.3 Admin session endpoint

Create controller:

- `apps/backend/src/controllers/admin-booking-support.controller.ts`

Route:

- `POST /api/admin/session`

Pseudo-code:

```ts
if (!env.ADMIN_PAGE_PASSWORD || input.password !== env.ADMIN_PAGE_PASSWORD) {
  throw new HTTPException(401, { message: "Invalid admin password" });
}

return c.json({ token: createAdminToken() });
```

## 6.4 Admin management endpoints

Controller routes:

- `GET /api/admin/events/:eventId/booking-support-resources`
- `PUT /api/admin/events/:eventId/booking-support-resources`
- `PUT /api/admin/batches/:batchId/booking-support-overrides`

All routes except session creation should require admin middleware.

Payload strategy:

- full replacement payloads only

Validation:

- use Zod arrays with strict field definitions matching entity semantics
- no `any`

## 7. Frontend Implementation

## 7.1 Route rename

Modify:

- `apps/frontend/src/router/index.ts`
- `apps/frontend/src/entities/pr/routes.ts`

Replace:

- `/apr/:id/economy`
- `anchor-pr-economy`
- `anchorPREconomyPath`

With:

- `/apr/:id/booking-support`
- `anchor-pr-booking-support`
- `anchorPRBookingSupportPath`

## 7.2 Query layer cleanup

Modify:

- `apps/frontend/src/shared/api/query-keys.ts`
- `apps/frontend/src/queries/useAnchorPR.ts`

Delete:

- `apps/frontend/src/queries/useAnchorPREconomy.ts`

Actions:

- rename query key from `economy` to `bookingSupport`
- rename inferred response types accordingly
- ensure there is only one booking-support query hook

## 7.3 Anchor PR detail page

Modify:

- `apps/frontend/src/pages/AnchorPRPage.vue`

Replace current summary logic:

- `paymentModelApplied`
- `resourceBookingDeadlineAt`

With:

- `bookingSupportPreview.headline`
- `bookingSupportPreview.highlights`
- `bookingSupportPreview.effectiveBookingDeadlineAt`

Pseudo-code:

```ts
const bookingSupportHeadline = computed(
  () => prDetail.value?.anchor.bookingSupportPreview.headline ?? t(...),
);
```

Keep preview compact. Do not dump all resource rows on the detail page.

## 7.4 New booking-support page

Create:

- `apps/frontend/src/pages/AnchorPRBookingSupportPage.vue`

Structure:

1. header + back link
2. overview card
3. resource cards list
4. reimbursement explanation card if relevant

Rendering rules:

- headline first
- highlights next
- per-resource card with:
  - summary text
  - detail rules
  - booking facts
  - settlement facts

The reimbursement area should be shown when any resource uses `PLATFORM_POSTPAID`, not when legacy `Model A` would have shown.

## 7.5 Admin page

Create:

- `apps/frontend/src/pages/AdminBookingSupportPage.vue`

Page sections:

1. password login form
2. event selector
3. template editor list
4. batch selector
5. override editor list
6. save actions

Add query/mutation hooks as needed, preferably in:

- `apps/frontend/src/queries/useAdminBookingSupport.ts`

Recommended local state model:

- fetch one event config payload
- clone into local editable state
- on save, send full replacement array

Keep the page intentionally utilitarian.

## 7.6 Frontend admin auth

Store admin token locally in page state or `sessionStorage`.

I recommend `sessionStorage` because:

- it survives refresh during an editing session;
- it clears when the browser session ends;
- it avoids polluting long-term local auth state.

Add the admin bearer token only to admin requests, not to global user RPC behavior.

## 7.7 Locales

Modify:

- `apps/frontend/src/locales/zh-CN.jsonc`

Actions:

- remove economy/model A/model C copy
- add `预订与资助` page copy
- add preview and resource-card labels
- add admin page labels and error messages

## 8. Seed Rewrite

Modify:

- `apps/backend/seeds/0001_anchor_event_bootstrap.sql`

Actions:

1. remove old event-level economy columns from insert statements
2. add inserts for:
   - `anchor_event_support_resources`
   - `anchor_event_batch_support_overrides` where needed
3. ensure demo events express support explicitly

Example target modeling:

### Badminton

- `场地费用`
  - `resource_kind = VENUE`
  - booking required
  - handled by platform
  - settlement mode per desired scenario
- `羽毛球`
  - `resource_kind = ITEM`
  - no booking
  - no settlement
- `能量饮料`
  - `resource_kind = ITEM`
  - no booking
  - no settlement

### Study sprint

- `桌面时钟`
  - `resource_kind = ITEM`
  - no booking
  - no settlement

If seed-created PRs exist, ensure their resolved `anchor_pr_support_resources` are created either:

- through application creation logic, or
- explicitly in seed SQL if creation is not app-driven

Prefer app-driven resolution only if such path is already present and deterministic.

## 9. Documentation Updates

After code works, update:

- `docs/product/overview.md`
- `docs/product/glossary.md`

Changes:

- replace “economy page” with booking-support semantics
- remove `PaymentModel (A/C)` glossary
- add `Booking Support`
- add `Support Resource`
- add `Support Settlement Mode`

## 10. Pseudo-Code Summary by Critical Path

## 10.1 Materialize on PR creation

```ts
const createdRoot = await prRepo.create(...);
await anchorPRRepo.create(...);

await materializePRSupportResources({
  prId: createdRoot.id,
  anchorEventId,
  batchId,
  location: createdRoot.location,
  timeWindow: createdRoot.time,
});
```

## 10.2 Lifecycle deadline lookup

```ts
const effectiveBookingDeadlineAt =
  request.prKind === "ANCHOR"
    ? await getEffectiveBookingDeadline(request.id)
    : null;
```

## 10.3 Preview assembly

```ts
const supportRows = await prSupportRepo.findByPrId(id);
const preview = buildBookingSupportPreview(supportRows);

return {
  ...,
  anchor: {
    ...,
    bookingSupportPreview: preview,
  },
};
```

## 10.4 Admin replace write

```ts
await eventSupportRepo.replaceByAnchorEventId(eventId, validatedRows);
```

```ts
await batchOverrideRepo.replaceByBatchId(batchId, validatedRows);
```

## 11. Verification Plan

The repo instruction says build pass is the required bar; no test maintenance is required.

Required verification steps:

1. `pnpm db:generate`
2. `pnpm db:reset`
3. `pnpm build:backend`
4. `pnpm build:frontend`
5. `pnpm build`

Manual smoke checks after local run:

1. Open an Anchor PR detail page and verify the preview card uses booking-support copy.
2. Open `/apr/:id/booking-support` and verify overview + resources render.
3. Confirm no route still points to `/apr/:id/economy`.
4. Verify booking-deadline logic still prevents exit after lock for an Anchor PR with locking support resources.
5. Verify reimbursement prompt shows for postpaid-support scenarios only.
6. Open `/admin/booking-support`, authenticate with admin password, edit an event template, save, refresh, and confirm data persists.
7. Edit batch overrides, create or auto-create a new Anchor PR from that batch, and confirm resolved PR support reflects the override.

## 12. Implementation Boundaries

Do in this task:

- full rename to booking-support semantics
- new support-resource schema
- admin page
- seed rewrite
- documentation updates

Do not do in this task:

- generalized admin framework
- user account based operator roles
- Community PR support-resource modeling
- real financial collection/reconciliation workflow

## 13. Approval Gate for Implementation

After this L3 is approved, implementation will follow this plan directly:

1. schema reset + entity rewrite
2. domain/repository/controller updates
3. frontend rename + new pages
4. admin flow
5. seeds/docs/build verification
