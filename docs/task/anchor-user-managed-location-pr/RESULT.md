# RESULT

## Scope Delivered

Implemented user-initiated Anchor PR creation for event batches, with split location pools and per-location per-batch caps.

- Split Anchor Event location pool into:
  - `systemLocationPool: string[]`
  - `userLocationPool: { id: string; perBatchCap: number }[]`
- Added `anchor_partner_requests.location_source` (`SYSTEM` | `USER`) to distinguish origin.
- Added public create endpoint on event detail flow:
  - `POST /api/events/:eventId/batches/:batchId/anchor-prs`
  - request body: `{ locationId: string }`
- Added per-batch cap enforcement for user-origin PR creation by `(batchId, locationId)`.
- Added event-detail batch-level `locationOptions` for frontend rendering of selectable/disabled locations.
- Added activity-page creation card at the end of batch PR list:
  - reusable expand/collapse container (default collapsed)
  - create action calls POST endpoint directly
  - disabled options show reason when cap reached
- Relaxed admin restrictions so Anchor PR management can choose locations from
  both `systemLocationPool` and `userLocationPool`.
- Admin-created Anchor PR now sets `locationSource=USER` when the selected
  location belongs to `userLocationPool`, and enforces per-batch cap on create
  and edit flows so these PRs consume user-location quota.
- Removed special hard restrictions around resource support for user-origin PRs; booking/resource behavior remains admin-configurable.

## API / Error Contract

For `POST /api/events/:eventId/batches/:batchId/anchor-prs`, added RFC 7807 style problem responses (`application/problem+json`) for key action errors:

- 401 WeChat auth required
  - `code: WECHAT_AUTH_REQUIRED`
- 409 selected location cap reached
  - `code: LOCATION_CAP_REACHED`

Frontend create mutation handles 401 problem response and triggers WeChat OAuth redirect.

## Major Backend Changes

- Schema/entity updates:
  - `apps/backend/src/entities/anchor-event.ts`
  - `apps/backend/src/entities/anchor-partner-request.ts`
  - migration: `apps/backend/drizzle/0003_anchor_event_location_pool_split_and_source.sql`
  - seed alignment: `apps/backend/seeds/0001_anchor_event_bootstrap.sql`
- Repository updates:
  - `AnchorEventRepository` update fields
  - `AnchorPRRepository` added count method for active visible PRs by batch+location+source
- Use-cases:
  - new `create-user-anchor-pr.ts`
  - updated admin create/update/workspace/event detail/list/expand/accept-alt-batch paths for split pools + source
- Controller:
  - `apps/backend/src/controllers/anchor-event.controller.ts` now includes authenticated POST route and RFC 7807 responses.

## Major Frontend Changes

- Event page user creation flow:
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - new mutation: `apps/frontend/src/domains/event/queries/useCreateUserAnchorPR.ts`
  - new creation card: `apps/frontend/src/domains/event/ui/primitives/AnchorPRCreateCard.vue`
  - new reusable expandable component: `apps/frontend/src/shared/ui/containers/ExpandableCard.vue`
- Admin pages adapted to new pool model:
  - `apps/frontend/src/domains/admin/queries/useAdminAnchorManagement.ts`
  - `apps/frontend/src/pages/AdminAnchorPRPage.vue`
  - `apps/frontend/src/pages/AdminBookingSupportPage.vue`

## Validation

Build checks passed:

- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`

## Notes

- Admin Anchor Event form now supports user location pool editing via line format: `locationId,perBatchCap`.
- Event page does not expose "system-managed vs user-managed" terminology to users; users only see selectable locations with disabled states and reason when max reached.
