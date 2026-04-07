# L1 Plan (Execution Strategy & Workstreams)

## Goal

Deliver issue #136 as a source-of-truth simplification for Anchor PR booking-support resources while preserving public booking-support behavior and admin booking execution auditability.

## Recommended End State

### Data authority

- `anchor_event_support_resources` remains the only editable support-resource source of truth
- APR effective resources are resolved at read time
- no PR-local copied support rows
- no batch-level support override layer, if strict scope is confirmed

### Runtime read model

Introduce one shared backend resolver that returns effective support resources for an Anchor PR from:

- Anchor PR root record
- Anchor subtype row
- event support resources
- PR location
- PR time window

The resolver should return computed rows that look close enough to current consumer needs so existing preview/contact/deadline logic can be migrated with minimal UI contract churn.

### Audit model

Booking execution should store:

- immutable resource title snapshot
- optional stable reference to event resource identity

It must no longer depend on PR snapshot ids.

## Workstream 1: Pre-Migration Audit

### Purpose

Verify whether strict simplification is safe before schema work begins.

### Checks

1. list all rows in `anchor_event_batch_support_overrides`
2. identify whether any non-seed environment relies on batch-specific differences
3. inspect whether any existing booking execution rows reference PR resources whose `sourceEventSupportResourceId` is null

### Exit criteria

- if batch overrides are unused or disposable, proceed with strict plan
- if batch overrides encode required product truth, downgrade to the narrow plan and keep override resolution

## Workstream 2: Effective Resource Resolver

### New core service

Add a service shaped like:

```ts
resolveEffectiveSupportResourcesForAnchorPR(prContext): EffectiveSupportResource[]
```

### Responsibilities

1. load event support resources
2. filter by location
3. compute `bookingDeadlineAt` from `bookingDeadlineRule + PR time window`
4. preserve ordering semantics
5. return a stable consumer-friendly shape

### Notes

- If the narrow plan is chosen, this resolver can temporarily keep `batch overrides` as one input layer.
- If the strict plan is chosen, the resolver should not know anything about batch override.

## Workstream 3: Consumer Cutover

### Backend read-path consumers to migrate

- `apps/backend/src/domains/pr-booking-support/use-cases/get-anchor-pr-booking-support.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`
- `apps/backend/src/domains/pr-core/services/anchor-booking-trigger.service.ts`
- `apps/backend/src/domains/pr-booking-support/services/get-effective-booking-deadline.ts`
- `apps/backend/src/domains/pr-booking-support/services/build-booking-support-preview.ts`
- `apps/backend/src/domains/pr-booking-support/services/is-booking-contact-required.ts`
- `apps/backend/src/domains/pr-booking-support/services/resolve-booking-contact-state.ts`
- `apps/backend/src/domains/admin-booking-execution/use-cases/get-admin-booking-execution-workspace.ts`
- `apps/backend/src/domains/admin-booking-execution/use-cases/submit-admin-anchor-pr-booking-execution.ts`

### Creation/mutation paths to simplify

Remove materialization calls from:

- `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-pr.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/update-admin-anchor-pr-content.ts`
- `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts`

### Expected result

Anchor PR flows no longer do hidden resource copy work.

## Workstream 4: Booking Execution Reference Migration

### Problem

`anchor_pr_booking_executions.target_resource_id` currently references `anchor_pr_support_resources`.

### Recommended migration shape

1. add a new nullable column such as `target_event_support_resource_id`
2. backfill it from `anchor_pr_support_resources.source_event_support_resource_id`
3. switch code to read/write the new reference
4. keep `target_resource_title` as immutable audit text
5. only after cutover, drop the old PR-snapshot reference

### Why this order

It avoids coupling the schema change to same-release table deletion and keeps audit rows readable even if event resources are later deleted.

## Workstream 5: Admin Surface Simplification

### Backend

If strict plan is confirmed:

- remove `replace-batch-booking-support-overrides.ts`
- remove `PUT /api/admin/batches/:batchId/booking-support-overrides`
- remove batch override arrays from `get-admin-booking-support-config.ts`

### Frontend

Simplify `apps/frontend/src/pages/AdminBookingSupportPage.vue` so it only edits event resources.

Also update:

- `apps/frontend/src/domains/admin/queries/useAdminBookingSupport.ts`
- locale keys used only by override editor

### Invariant

The admin page route can stay `/admin/booking-support`; this task does not require a route rename.

## Workstream 6: Schema Contraction

### Strict plan

After all consumers are cut over:

1. drop `anchor_event_batch_support_overrides`
2. drop `anchor_pr_support_resources`
3. remove related repositories, exports, migration references, and seed inserts

### Narrow fallback plan

If batch override must survive:

1. keep `anchor_event_batch_support_overrides`
2. drop only `anchor_pr_support_resources`
3. keep runtime resolver precedence as `batch override > event resource`

## Suggested Implementation Order

1. audit override usage and confirm strict vs narrow scope
2. add effective-resource resolver
3. expand booking-execution schema with event-resource reference
4. migrate backend consumers to resolver
5. remove materialization from PR creation/update flows
6. simplify admin backend/frontend contract
7. remove dead tables/repos/services
8. update seeds and migration artifacts
9. run regression verification

## Verification Checklist

### Public flow

1. open `/apr/:id`
2. open `/apr/:id/booking-support`
3. verify support highlights, per-resource details, and effective booking deadline still render correctly

### Domain behavior

1. confirm booking-trigger pending logic still works for platform-handled required resources
2. confirm booking contact required/not-required logic is unchanged
3. confirm reimbursement eligibility still reflects effective settlement mode
4. confirm exit/lock behavior still respects effective booking deadline

### Admin flow

1. edit event resources in `/admin/booking-support`
2. verify existing APRs reflect the new config without rematerialization
3. submit booking execution and confirm audit row keeps stable resource title/reference

### Data checks

1. confirm no remaining reads or writes to `anchor_pr_support_resources`
2. confirm no remaining writes or UI reads for batch override in strict plan
3. confirm seed/bootstrap data still expresses intended support behavior after simplification

## Main Risks

### Risk 1

Retroactive config changes may surprise existing APR participants.

Mitigation:

- make this an explicit product-approved behavior before implementation

### Risk 2

Hidden consumers may still expect PR snapshot ids.

Mitigation:

- grep-driven cutover plus compile-time failure from removed repository/entity exports

### Risk 3

Dropping batch override may silently remove meaningful time-window differences.

Mitigation:

- pre-migration audit and manual cleanup before contract removal

## L1 Conclusion

Issue #136 is a worthwhile simplification, but only if it is treated as a full source-of-truth refactor instead of a table deletion.

The success condition is not "remove one table". The success condition is:

- one clear authority layer
- one shared effective-resource resolver
- no hidden materialization hooks
- preserved booking execution audit integrity
