# PLAN: Anchor Event Page - User APR Creation + Frontend CPR Fallback

## 1. Statement To Satisfy

> In Anchor Event Page, allow users to create Anchor PR by themselves (current batch, different location, selected from user location pool; in Card mode user also needs to choose batch).
> If there is actually no available location or batch, auto-create CPR instead of blocking PR creation.
> Also support event-level `minPartners/maxPartners` config on Anchor Event, and derive subsequent Anchor PR creation values (user + admin) from it.

## 2. Current Implementation Audit

### 2.1 What already matches

1. List mode can create user-managed APR for selected batch + selected location.
- Frontend creation entry exists in list mode (`apps/frontend/src/pages/AnchorEventPage.vue`).
- Backend endpoint exists: `POST /api/events/:eventId/batches/:batchId/anchor-prs` (`apps/backend/src/controllers/anchor-event.controller.ts`).

2. Card mode has batch selector + location selector in empty state.
- UI exists when there is no active demand card (`apps/frontend/src/pages/AnchorEventPage.vue`).

### 2.2 Gaps vs statement

G1. No-availability path is blocking, not fallback.
- In both list/card creation widgets, create button is disabled when no selectable location (`apps/frontend/src/pages/AnchorEventPage.vue`, `apps/frontend/src/domains/event/ui/primitives/AnchorPRCreateCard.vue`).
- If event has zero batches, user sees empty state only (no PR creation path).

G2. APR failure currently only shows error, does not create CPR.
- `useCreateUserAnchorPR` only throws error on non-2xx (`apps/frontend/src/domains/event/queries/useCreateUserAnchorPR.ts`).

G3. No Anchor Event-level partner bound defaults exist today.
- `AnchorEvent` schema has no event-level `minPartners/maxPartners` fields (`apps/backend/src/entities/anchor-event.ts`).
- User-created APR currently persists `minPartners=null`, `maxPartners=null` (`apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`).
- Admin-created APR currently depends on per-request form input, not event-level defaults (`apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-pr.ts`).

## 3. Target Behavior

- User creation intent from Anchor Event Page must be non-blocking for availability constraints.
- Preferred path remains APR creation in selected anchor context.
- If APR cannot be created due to availability/batch/location constraints, frontend automatically falls back to CPR create+publish.
- APR flow on this page does not need availability pre-check in frontend; fallback is driven by APR response.
- Card mode behavior stays unchanged: creation card appears only after card queue is exhausted.
- Any newly created APR (user/admin path) derives partner bounds from Anchor Event defaults.

## 4. Solution Proposal

## 4.1 Decision: frontend-orchestrated fallback (chosen per product direction)

Keep backend APR endpoint as-is and orchestrate fallback in frontend:

1. Try APR create first (no frontend availability pre-check).
2. On eligible APR failure, fallback to CPR create+publish.
3. Route to created page (`/apr/:id` or `/cpr/:id`).

Trade-off:
- This duplicates part of decision logic in frontend and is less centralized than backend orchestration.
- Mitigation: strictly narrow fallback trigger conditions and standardize backend error codes for stable frontend branching.

## 4.2 API usage model (no new unified endpoint)

APR path (existing):
- `POST /api/events/:eventId/batches/:batchId/anchor-prs`

CPR fallback path (existing):
- `POST /api/cpr` (create draft)
- `POST /api/cpr/:id/publish` (publish to OPEN)

No new `/api/events/:eventId/user-prs` endpoint.

## 4.3 Frontend fallback algorithm

In `AnchorEventPage.vue` use-case layer:

1. Resolve intended anchor target from UI state:
- List mode: current selected batch + location.
- Card mode (only exhausted state): user-selected batch + location.

2. If `batchId/locationId` is missing locally (no valid APR target), create CPR directly.

3. Else, send APR create request.

4. If APR request fails, fallback to CPR for:
- `409 LOCATION_CAP_REACHED`
- `400` invalid/removed location in pool
- `404` batch/event mismatch after refresh/race
- `401/503` WeChat auth related (safe because endpoint checks availability before auth)

5. Do NOT fallback for unknown system failures:
- network/5xx unknown failures: keep explicit error.

6. CPR fallback create payload mapping:
- `type = event.type`
- `time = selectedBatch.timeWindow` when batch resolvable, else `[null, null]`
- `location = selected location or null`
- `title = null`
- `minPartners/maxPartners = null`
- `preferences = []`
- `notes = "Created from Anchor Event fallback"`
- `budget = null`

7. On fallback success:
- route to `/cpr/:id`
- optional info toast: "当前无可用活动位，已自动创建 Community PR"

## 4.4 Card mode behavior constraint (explicit)

Keep current behavior unchanged:
- When card queue still has cards, no creation card is shown.
- Creation card is shown only in exhausted state.

## 4.5 APR endpoint auth-check order change

Change `POST /api/events/:eventId/batches/:batchId/anchor-prs` flow:

1. Validate event/batch/location and availability first (including cap check).
2. Only after availability passes, validate WeChat auth (`openId`).
3. Then proceed to create APR.

Rationale:
- Frontend fallback on `401/503` is deterministic and safe for this page flow.
- Avoids auth-first failure masking availability failure.

## 4.6 Anchor Event-level default `min/max` partner bounds

Data model changes:
- Add nullable fields on `anchor_events`:
  - `defaultMinPartners: integer | null`
  - `defaultMaxPartners: integer | null`
- Add migration + entity/repository updates.

Validation rules:
- Reuse existing partner-bound constraints:
  - both null is allowed
  - if both set, `0 <= min <= max`
  - single-sided bound allowed (`min` only or `max` only)

Admin API/UI changes:
- Extend admin event create/update payloads and workspace response with:
  - `defaultMinPartners`
  - `defaultMaxPartners`
- Add event-form controls in `AdminAnchorPRPage.vue`.

Derivation rules for APR creation:
- User APR creation:
  - always derive `minPartners/maxPartners` from Anchor Event defaults.
- Admin APR creation:
  - derive defaults from Anchor Event first;
  - allow explicit admin override only when request payload provides non-null values.

Technical implementation note:
- Add shared backend helper, e.g. `resolveAnchorPartnerBoundsFromEvent(eventDefaults, adminOverride?)`, and reuse in:
  - `create-user-anchor-pr.ts`
  - `create-admin-anchor-pr.ts`

## 5. Delivery Steps

1. Frontend: introduce `createWithFallback` flow in `AnchorEventPage.vue` use-case (`APR -> conditional CPR fallback`).
2. Frontend: keep card-mode creation entry only in exhausted branch.
3. Frontend: add fallback reason handling + user feedback copy.
4. Backend: reorder APR-create flow to check availability before WeChat auth.
5. Backend: standardize APR-create error payloads/codes for reliable frontend fallback branching (especially 400/404 cases).
6. Backend: add Anchor Event `defaultMinPartners/defaultMaxPartners` schema + migration + repository updates.
7. Backend: wire partner-bound derivation helper into user/admin APR creation flows.
8. Frontend Admin: add event-level min/max controls and bind to admin APIs.
9. Docs + i18n updates.

## 6. Acceptance Matrix

1. List mode, valid batch + valid location + available quota -> creates APR and lands `/apr/:id`.
2. List mode, batch exists but all locations exhausted -> auto creates CPR and lands `/cpr/:id`.
3. List mode, event has zero batch -> auto creates CPR.
4. List mode, stale race: frontend thought available, APR returns `LOCATION_CAP_REACHED` -> auto creates CPR.
5. Card mode with remaining cards -> no creation card is displayed.
6. Card mode exhausted, user picks batch + valid location with quota -> creates APR.
7. Card mode exhausted, picked batch has no available location -> auto creates CPR.
8. APR create returns `401/503` WeChat auth error -> auto creates CPR (after backend availability-first check).
9. Configure event defaults (`min=2`, `max=4`), user creates APR -> created APR stores `2/4`.
10. Configure event defaults (`min=2`, `max=4`), admin creates APR without override -> created APR stores `2/4`.
11. Configure event defaults (`min=2`, `max=4`), admin creates APR with explicit override (`3/6`) -> created APR stores `3/6`.
12. Update event defaults after some APRs exist -> only subsequent APR creations use new defaults (no retroactive rewrite).

## 7. Out Of Scope

- No redesign of demand-card join flow.
- No global auth/error interceptor refactor.
- No change to existing APR participation rules.
