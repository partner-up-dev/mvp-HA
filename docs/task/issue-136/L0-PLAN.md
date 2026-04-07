# L0 Plan (Problem Framing & Decision Gates)

## Task Name

- `issue-136`

## Issue Link

- GitHub: `#136 移除活动的”批次覆盖“`

## Working Restatement

Issue #136 asks to simplify Anchor PR booking-support resources so APR reads through to event-owned resources instead of relying on copied PR-level rows.

Current code terms do not exactly match the issue wording:

- issue text says `anchor_partner_request_resources`
- current backend reality is `anchor_pr_support_resources`

There is also one scope ambiguity inside the issue itself:

1. narrow interpretation:
   - remove `anchor_pr_support_resources`
   - keep `anchor_event_batch_support_overrides`
   - resolve APR resources dynamically from `event resources + batch overrides`
2. strict interpretation:
   - remove `anchor_pr_support_resources`
   - remove `anchor_event_batch_support_overrides`
   - resolve APR resources directly from event resources only

This task packet uses the strict interpretation as the recommended simplification target, but keeps the narrow interpretation as fallback if product truth still requires batch-specific differences.

## Current Implementation Snapshot

Current booking-support authority is split across three layers:

1. event templates
   - `apps/backend/src/entities/anchor-event-support-resource.ts`
2. batch overrides
   - `apps/backend/src/entities/anchor-event-batch-support-override.ts`
3. PR-level resolved snapshots
   - `apps/backend/src/entities/anchor-pr-support-resource.ts`

Current write-time materialization happens in multiple Anchor PR creation or mutation flows:

- `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-pr.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/update-admin-anchor-pr-content.ts`
- `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts`

Each of those paths calls:

- `apps/backend/src/domains/pr-booking-support/services/materialize-pr-support-resources.ts`

That service loads event resources + batch overrides, resolves effective fields, computes `bookingDeadlineAt`, and replaces all `anchor_pr_support_resources` rows for the PR.

## Why The Current Model Is High-Friction

### 1. Authority is duplicated

The same product truth can exist simultaneously in:

- event templates
- batch overrides
- PR snapshots

That increases drift risk and makes it harder to answer which layer is authoritative after an admin edit.

### 2. PR creation and PR editing contain hidden config-sync work

Resource materialization is not domain-central; it is scattered across create, update, auto-expand, and alternative-batch flows.

This means a future flow can become subtly wrong by forgetting to call the materializer.

### 3. Admin edits do not naturally propagate

If an event resource changes after PR creation, existing PRs keep stale resolved rows unless something explicitly rematerializes them.

That is the opposite of the issue's "pass through to event resources" intent.

### 4. The model is harder than the actual product need

The current design preserves time-window-specific support differences and PR-local snapshots, but issue #136 explicitly pushes toward a flatter source-of-truth model.

If the product no longer wants batch-level support differences, keeping those layers only preserves complexity.

## Hard Couplings That Prevent A Careless Table Drop

### A. Booking execution audit currently points at PR snapshots

`anchor_pr_booking_executions.target_resource_id` currently references `anchor_pr_support_resources`.

Files:

- `apps/backend/src/entities/anchor-pr-booking-execution.ts`
- `apps/backend/src/domains/admin-booking-execution/use-cases/submit-admin-anchor-pr-booking-execution.ts`

So removing `anchor_pr_support_resources` requires an audit-safe replacement reference, not just a repository delete.

### B. Many read models rely on PR snapshot shape

Direct PR-support reads currently drive:

- public booking-support detail
- Anchor PR detail preview
- reimbursement eligibility
- effective booking deadline
- booking contact requirement/state
- booking-trigger pending logic
- admin booking execution workspace

Representative files:

- `apps/backend/src/domains/pr-booking-support/use-cases/get-anchor-pr-booking-support.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`
- `apps/backend/src/domains/pr-core/services/anchor-booking-trigger.service.ts`
- `apps/backend/src/domains/admin-booking-execution/use-cases/get-admin-booking-execution-workspace.ts`

### C. Batch override is a real exposed capability, not an internal helper

Admin surface currently exposes:

- backend route: `PUT /api/admin/batches/:batchId/booking-support-overrides`
- frontend page editor: `apps/frontend/src/pages/AdminBookingSupportPage.vue`

This means removing batch override changes the actual admin capability, not only backend internals.

### D. Seed data currently uses batch override

`apps/backend/seeds/0001_anchor_event_bootstrap.sql` inserts a batch override that changes deadline and summary copy for a specific batch.

That makes "remove batch override" a product-behavior change, not merely storage cleanup.

## First-Principles Recommendation

### Recommended target

Use one authoritative configuration layer for support resources:

- keep `anchor_event_support_resources`
- remove `anchor_pr_support_resources`
- remove `anchor_event_batch_support_overrides`
- resolve APR effective resources dynamically from:
  - Anchor PR root time window
  - Anchor PR location
  - event support resources

### Why this is the cleanest model

1. one source of truth is easier to reason about
2. all APRs under one event see the same current support policy, filtered only by location and time-derived deadline computation
3. Anchor PR creation flows become simpler because resource sync work disappears
4. admin editing surface becomes smaller and easier to maintain

### What must remain snapshot-based

Historical execution audit should keep its own immutable snapshot fields:

- target resource title
- notification summary
- phone used at execution time

Optional stable reference may still exist, but it should point to event resource identity, not PR snapshot identity.

## Main Trade-Offs To Make Explicit

### Trade-off 1: retroactive effect on existing APRs

If APR resources read directly from event resources, then an admin edit to event support config will immediately affect already-created APRs.

This is a real semantic change.

Recommended stance:

- accept retroactive behavior as the intentional consequence of "pass through to event resources"

Fallback if that is not acceptable:

- keep PR snapshots and only remove batch override

That fallback is less simple and should not be chosen unless product explicitly needs non-retroactive policy freezing.

### Trade-off 2: loss of batch-specific support behavior

Removing batch override means different time windows under the same event can no longer express different support text, deadlines, or disablement rules.

Recommended stance:

- accept this loss and treat it as desired simplification

Migration gate:

- before implementation, audit all existing batch overrides and confirm they are either disposable or can be manually folded into event-level defaults

Fallback if batch-specific behavior is still required:

- keep batch override, but still remove PR snapshots

### Trade-off 3: execution reference identity

Current booking execution uses PR resource ids for selection and persistence.

Recommended stance:

- move execution selection/reference to event resource identity
- preserve human-readable snapshot fields on the execution row

Do not overload the old PR-snapshot id semantics without renaming or backfill planning.

## Recommended Scope

### In scope

- remove PR-level support snapshot dependency
- remove batch override capability if product confirms strict interpretation
- introduce one runtime resolver for "effective APR support resources"
- migrate booking execution reference model
- simplify admin booking-support contract and UI

### Out of scope

- redesign of user-facing booking-support copy
- unrelated PR lifecycle refactors
- broader subsidy/economy model changes outside resource authority

## Invariants To Preserve

The following behaviors should remain true after implementation:

1. `/apr/:id/booking-support` still renders the same kind of support overview and per-resource rules.
2. resource applicability still respects location filtering.
3. booking deadline is still derived from the resource rule against the PR time window.
4. reimbursement eligibility still depends on effective support settlement mode.
5. admin booking execution still works with an auditable resource selection and immutable execution snapshot fields.
6. booking-trigger logic still only reacts to effective platform-handled required resources.

## Decision Gates Before Coding

### Gate A

Confirm whether issue #136 means:

- strict: remove both batch override and PR snapshots
- narrow: remove only PR snapshots

### Gate B

Confirm whether retroactive event-resource edits are allowed to change existing APR behavior.

### Gate C

Run a pre-migration audit of current batch override usage:

- seed data
- local/staging/prod rows, if accessible during implementation

If real batch-specific divergence exists and must be preserved, the strict plan is invalid.

## L0 Conclusion

The technically clean path is:

1. keep event resources as the only authoritative booking-support config layer
2. replace PR snapshot reads with runtime effective-resource resolution
3. move booking execution references off PR snapshot ids
4. delete batch override capability only if product accepts losing batch-specific support divergence

That is the plan L1 expands into concrete implementation workstreams.
