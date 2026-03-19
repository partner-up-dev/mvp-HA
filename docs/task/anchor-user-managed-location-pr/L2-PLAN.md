# L2 Plan - Low-Level Design (Anchor User-Managed Location PR Creation)

## 1) Scope and Non-goals

Scope:
- Implement explicit location pool split (`system` + `user` with per-location cap).
- Add user-side Anchor PR creation from event batch page.
- Enforce per-(batch, location) active PR cap.
- Keep booking/resource behavior fully admin-configured (no origin-based override).
- Require WeChat auth for creation through backend-auth-then-frontend-redirect flow.

Non-goals:
- Do not redesign booking-support domain rules.
- Do not add global API interceptor for 401-to-WeChat redirect.
- Do not change existing join/exit/confirm/check-in contracts.

## 2) Backend Low-Level Design

### 2.1 Entity and Type changes

File: `apps/backend/src/entities/anchor-event.ts`

- Replace single event location pool with explicit split:
  - `systemLocationPool: string[]` (`system_location_pool`)
  - `userLocationPool: UserLocationEntry[]` (`user_location_pool`)

```ts
export const userLocationEntrySchema = z.object({
  id: z.string().trim().min(1),
  perBatchCap: z.number().int().positive(),
});
export type UserLocationEntry = z.infer<typeof userLocationEntrySchema>;
```

- Add normalizers:
  - `normalizeSystemLocationPool(raw): string[]`
  - `normalizeUserLocationPool(raw): UserLocationEntry[]`

File: `apps/backend/src/entities/anchor-partner-request.ts`

- Add `locationSource`:

```ts
export const anchorLocationSourceSchema = z.enum(["SYSTEM", "USER"]);
export type AnchorLocationSource = z.infer<typeof anchorLocationSourceSchema>;
```

- New DB column: `location_source text not null default 'SYSTEM'`.

### 2.2 Migration design

New migration file: `apps/backend/drizzle/0003_anchor_event_location_pool_split_and_source.sql`

Steps:
1. `anchor_events`:
   - add `system_location_pool jsonb not null default '[]'::jsonb`
   - add `user_location_pool jsonb not null default '[]'::jsonb`
   - backfill `system_location_pool = coalesce(location_pool, '[]'::jsonb)`
   - drop old `location_pool`
2. `anchor_partner_requests`:
   - add `location_source text not null default 'SYSTEM'`

Seed update:
- `apps/backend/seeds/0001_anchor_event_bootstrap.sql`
  - replace `location_pool` with `system_location_pool`
  - add `user_location_pool` values (can default to `[]` initially)

### 2.3 Repository updates

File: `apps/backend/src/repositories/AnchorEventRepository.ts`
- update `update()` pick fields to include:
  - `systemLocationPool`
  - `userLocationPool`

File: `apps/backend/src/repositories/AnchorPRRepository.ts`
- add method for quota check:

```ts
countActiveVisibleByBatchAndLocationSource(
  batchId: number,
  location: string,
  locationSource: "SYSTEM" | "USER",
): Promise<number>
```

Active-visible filter:
- `visibilityStatus = VISIBLE`
- `status NOT IN ('CLOSED', 'EXPIRED')`

### 2.4 Controller contracts

File: `apps/backend/src/controllers/anchor-event.controller.ts`

Keep existing:
- `GET /api/events`
- `GET /api/events/:eventId`

Add new:
- `POST /api/events/:eventId/batches/:batchId/anchor-prs`

Input schema:
```ts
{ locationId: z.string().trim().min(1) }
```

Success:
- `201`
- body:
```ts
{ id: number; canonicalPath: string }
```

Auth error:
- `401`
- body (RFC 7807 `application/problem+json`):
```ts
{
  type: "https://partner-up.dev/problems/wechat-login-required",
  title: "WeChat login required",
  status: 401,
  detail: "Current action requires a valid WeChat OAuth session.",
  code: "WECHAT_LOGIN_REQUIRED",
  authType: "WECHAT_OAUTH"
}
```

Quota error:
- `409`
- body (RFC 7807 `application/problem+json`):
```ts
{
  type: "https://partner-up.dev/problems/location-cap-reached",
  title: "Location cap reached",
  status: 409,
  detail: "The selected location reached its batch cap.",
  code: "LOCATION_CAP_REACHED",
  locationId: string
}
```

### 2.5 New use-case: create user Anchor PR

New file: `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`

Signature:
```ts
createUserAnchorPR(input: {
  eventId: number;
  batchId: number;
  locationId: string;
  openId: string;
}): Promise<{ id: number; canonicalPath: string }>
```

Algorithm:
1. Load event and batch, ensure `batch.anchorEventId === event.id`.
2. Ensure selected `locationId` exists in `event.userLocationPool`.
3. Resolve per-location cap from selected user location entry.
4. Resolve user by `openId`, set `createdBy` on root PR.
5. Start DB transaction.
6. Acquire transaction advisory lock (batch-scoped).
7. Count current active visible USER-origin PRs for `(batchId, locationId)`.
8. If count >= cap, abort with 409 `LOCATION_CAP_REACHED`.
9. Create root PR:
   - `prKind = ANCHOR`
   - `status = OPEN`
   - `type = event.type`
   - `time = batch.timeWindow`
   - `location = locationId`
   - `createdBy = resolved user id`
   - `title = null`, `preferences = []`, `notes = null`, `min/max` keep current default strategy
10. Create anchor subtype row with:
   - `locationSource = USER`
   - existing policy defaults (`confirmation/join lock offsets`)
11. Initialize slots with existing slot initializer.
12. Materialize support resources using existing admin-configured semantics (no source-based booking override).
13. Commit and return `id + canonicalPath`.
14. Operation log: `anchor.pr.user_create` with batch/location/user metadata.

### 2.6 Event detail extension algorithm

File: `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`

Extend `BatchDetail`:
```ts
locationOptions: Array<{
  locationId: string;
  remainingQuota: number;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED";
}>;
```

For each batch:
1. Iterate `event.userLocationPool` entries.
2. For each location, compute active-visible USER-origin count.
3. `remainingQuota = max(perBatchCap - activeCount, 0)`
4. `disabled = remainingQuota === 0`
5. `disabledReason = disabled ? 'MAX_REACHED' : 'NONE'`

Note:
- This data is for creation UI only; no pool-type labels are exposed to end user.

### 2.7 Admin workspace and admin routes

Files:
- `apps/backend/src/controllers/admin-anchor-management.controller.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/*`
- `apps/backend/src/domains/admin-anchor-management/use-cases/get-admin-anchor-workspace.ts`

Changes:
- admin event input/output switches from `locationPool` to:
  - `systemLocationPool: string[]`
  - `userLocationPool: { id: string; perBatchCap: number }[]`

Validation:
- dedupe by `id` in user pool
- `perBatchCap > 0`

### 2.8 Booking-support admin location selector source

File: `apps/backend/src/domains/pr-booking-support/use-cases/get-admin-booking-support-config.ts`

Location option source = union of:
- `systemLocationPool`
- `userLocationPool[].id`

No source-based restrictions for booking rules.

## 3) Frontend Low-Level Design

### 3.1 Reusable creation card component

New file:
- `apps/frontend/src/domains/event/ui/composites/AnchorPRCreateCard.vue`

Props:
```ts
{
  locationOptions: Array<{
    locationId: string;
    remainingQuota: number;
    disabled: boolean;
    disabledReason: "NONE" | "MAX_REACHED";
  }>;
  pending: boolean;
}
```

Emits:
```ts
("create", locationId: string)
```

State:
- `expanded` local state, default `false` (collapsed by default).
- selected location value.

UI:
- collapsed summary row + expand/collapse action.
- expanded panel: location selector, disabled reason `max reached`, pre-submit rule notice, create button.

### 3.2 Event page integration

File: `apps/frontend/src/pages/AnchorEventPage.vue`

Changes:
- After `AnchorEventPRCard` list, append `<AnchorPRCreateCard />`.
- Pass `selectedBatch.locationOptions`.
- Bind create action to mutation hook.

### 3.3 Event query types

File:
- `apps/frontend/src/domains/event/model/types.ts`

Since RPC inferred types are used, update usage sites only; no manual response interface.

### 3.4 New mutation hook and 401 auth handling

File (new):
- `apps/frontend/src/domains/event/queries/useCreateAnchorPRFromEvent.ts`

Mutation calls:
- `POST /api/events/:eventId/batches/:batchId/anchor-prs`

Error handling:
1. Parse error payload with optional `code` and `details`.
2. If `status=401 && code===WECHAT_LOGIN_REQUIRED`:
   - trigger `redirectToWeChatOAuthLogin(window.location.href)`
   - stop local error toast flow.
3. Else throw regular error for UI.

Important boundary:
- No global RPC client interceptor changes.
- Auth redirect remains use-case local.

Success handling:
- navigate to returned `canonicalPath`.
- invalidate `queryKeys.anchorEvent.detail(eventId)`.

### 3.5 i18n additions

File:
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

Add keys under `anchorEvent` (or new nested namespace) for:
- creation card title
- expand/collapse labels
- location selector label
- disabled reason text: `max reached`
- pre-submit notice text (booking/resource follow current configuration)
- create action/loading text

## 4) API/Error Shape Consistency

For this feature endpoint, error responses follow RFC 7807 (`application/problem+json`) with optional extension fields (`code`, `authType`, `locationId`).

Only this endpoint will rely on code-based branch in frontend.
No global full-stack error-shape migration is included in this task.

## 5) File-level Change List (Planned)

Backend:
- `apps/backend/src/entities/anchor-event.ts`
- `apps/backend/src/entities/anchor-partner-request.ts`
- `apps/backend/src/repositories/AnchorEventRepository.ts`
- `apps/backend/src/repositories/AnchorPRRepository.ts`
- `apps/backend/src/controllers/anchor-event.controller.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
- `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts` (new)
- `apps/backend/src/domains/anchor-event/use-cases/index.ts`
- `apps/backend/src/domains/pr-booking-support/use-cases/get-admin-booking-support-config.ts`
- `apps/backend/src/controllers/admin-anchor-management.controller.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-event.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/update-admin-anchor-event.ts`
- `apps/backend/src/domains/admin-anchor-management/use-cases/get-admin-anchor-workspace.ts`
- `apps/backend/drizzle/0003_anchor_event_location_pool_split_and_source.sql` (new)
- `apps/backend/seeds/0001_anchor_event_bootstrap.sql`

Frontend:
- `apps/frontend/src/pages/AnchorEventPage.vue`
- `apps/frontend/src/domains/event/ui/composites/AnchorPRCreateCard.vue` (new)
- `apps/frontend/src/domains/event/queries/useCreateAnchorPRFromEvent.ts` (new)
- `apps/frontend/src/domains/admin/queries/useAdminAnchorManagement.ts`
- `apps/frontend/src/pages/AdminAnchorPRPage.vue`
- `apps/frontend/src/pages/AdminBookingSupportPage.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

## 6) Algorithmic Edge Cases

1. Two users create same `(batch, location)` concurrently near cap.
- Guarded by advisory xact lock + count-in-transaction.

2. Batch/event mismatch in POST path.
- Return 404/400 with deterministic message.

3. Selected location removed from user pool after page load.
- Backend revalidates and returns 400; frontend refreshes detail.

4. Cap reached between GET and POST.
- Backend returns 409 `LOCATION_CAP_REACHED`; frontend refetches detail and updates disabled state.

5. WeChat unauthenticated session.
- Backend 401 code response; mutation triggers OAuth redirect.

## 7) Build and Verification Plan

Required verification (no new tests required by workflow):
1. `pnpm --filter @partner-up-dev/backend build`
2. `pnpm --filter @partner-up-dev/frontend build`
3. Manual flow checks:
   - creation card collapsed by default
   - expand/collapse works
   - disabled option shows `max reached`
   - unauthenticated create leads to OAuth redirect via 401 code path
   - cap boundary enforced server-side under repeated submissions

## 8) L2 Exit

L2 provides concrete interfaces, endpoint/error contracts, and algorithms for direct implementation in L3.
