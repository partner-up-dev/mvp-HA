# L0 Plan - Anchor User-Managed Location PR Creation

## 1) Input Deconstruction (What must change)

Requested behavior:

1. Split Anchor Event location pool into:
   - System-managed pool
   - User-managed pool
2. On `AnchorEventPage` (`/events/:eventId`), append a creation card at the end of selected batch PR list so users can create Anchor PRs using user-managed locations under the selected batch.
3. Enforce a per-batch cap for PRs created from user-managed locations; the cap value is global (same across all batches).
4. For Anchor PRs based on user-managed locations:
   - No booking support
   - Resource support may still exist
   - This must be made explicit before user submits creation.

## 2) Current State Analysis (Evidence from codebase)

### Backend data model and use-cases

- `anchor_events.location_pool` is a single JSONB pool (`apps/backend/src/entities/anchor-event.ts`).
- Admin Event CRUD currently only accepts/returns this single pool (`apps/backend/src/controllers/admin-anchor-management.controller.ts`, `create-admin-anchor-event.ts`, `update-admin-anchor-event.ts`).
- Event detail currently returns only one `locationPool`, plus `batches[]` and `exhausted` (`apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`).
- Public event API has only:
  - `GET /api/events`
  - `GET /api/events/:eventId`
  (`apps/backend/src/controllers/anchor-event.controller.ts`)
- No public endpoint exists for user-created Anchor PR.
- Anchor PR creation currently exists only in admin workspace via `POST /api/admin/batches/:batchId/anchor-prs` (`create-admin-anchor-pr.ts`).

### Booking/support behavior

- PR support resources are materialized from event templates + batch overrides (`materialize-pr-support-resources.ts`, `resolve-support-resource-templates.ts`).
- Booking support preview and booking deadlines are derived from `bookingRequired + bookingLocksParticipant` fields on materialized resources.
- Current pipeline has no concept of "PR came from user-managed location", so booking-required rules can apply unless explicitly overridden.

### Frontend behavior

- `AnchorEventPage` only lists existing PR cards for selected batch (`apps/frontend/src/pages/AnchorEventPage.vue`), no creation affordance.
- Admin Anchor page uses single `locationPool` textarea (`apps/frontend/src/pages/AdminAnchorPRPage.vue`).
- Booking support admin location selector options are based on event `locationPool` (`apps/frontend/src/pages/AdminBookingSupportPage.vue`).

## 3) Architectural Pressure Points

1. **Pool split must not break existing admin/system flows**
   - Existing code assumes one pool for admin creation, auto expansion, event listing fallback POI mapping, and exhaustion computation.

2. **Per-batch cap must be concurrency-safe**
   - Naive "count then insert" can overshoot under concurrent requests.

3. **No-booking-for-user-managed must be durable**
   - If inferred only from current event pool membership, semantics can drift when event pools are edited later.

4. **Frontend needs server-provided creation policy context**
   - For clear pre-submit disclosure and disabled states (limit reached / no available user-managed locations), UI needs policy fields from API.

## 4) Preliminary Trade-off Analysis

### A. How to split pool in schema

Option A1: Replace existing `locationPool` field with `systemLocationPool` and add `userLocationPool`.
- Pros: explicit semantics.
- Cons: larger refactor blast radius (many call sites), higher regression risk.

Option A2: Keep existing `locationPool` as system-managed semantic + add `userLocationPool`.
- Pros: lowest migration risk and minimal breakage.
- Cons: naming debt (`locationPool` actually means system pool).

**L0 recommendation:** A2 (pragmatic for MVP cadence), while exposing explicit API naming at response layer where needed.

### B. How to enforce per-batch cap

Option B1: count + insert without lock.
- Pros: simple.
- Cons: race condition.

Option B2: transaction + advisory transaction lock per batch, then count + insert.
- Pros: robust under concurrency, no extra tables.
- Cons: slightly more implementation complexity.

Option B3: dedicated quota/counter table.
- Pros: explicit accounting model.
- Cons: larger design and migration scope.

**L0 recommendation:** B2.

### C. How to keep "no booking support" while allowing resources

Option C1: for user-managed PR materialization, keep resources but force booking fields off.
- Pros: exactly matches requirement.
- Cons: requires explicit source metadata and branching in materialization.

Option C2: block all resources for user-managed PR.
- Pros: trivial.
- Cons: violates requirement ("may have resource support").

**L0 recommendation:** C1.

## 5) External Research Notes (for design justification)

- PostgreSQL advisory locks support transaction-scoped locking (`pg_advisory_xact_lock`) and are suitable for application-defined serialization boundaries, which fits per-batch quota enforcement.
  - Source: PostgreSQL docs on explicit/advisory locking.
- OWASP API Security Top 10 (API4: Unrestricted Resource Consumption) recommends business-aligned request/resource limiting; this supports implementing a hard cap and clear client-side messaging.
  - Source: OWASP API Security 2023 API4 guidance.

## 6) Affected Surface Map (likely)

Backend:
- Entity/migration:
  - `apps/backend/src/entities/anchor-event.ts`
  - `apps/backend/src/entities/anchor-partner-request.ts`
  - `apps/backend/drizzle/*` new migration
- Controllers:
  - `apps/backend/src/controllers/anchor-event.controller.ts`
  - `apps/backend/src/controllers/admin-anchor-management.controller.ts`
- Domain use-cases:
  - `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
  - new user-create Anchor PR use-case (likely under `domains/anchor-event`)
  - admin event CRUD use-cases for split pools
- Booking materialization path:
  - `apps/backend/src/domains/pr-booking-support/services/materialize-pr-support-resources.ts`
  - `resolve-support-resource-templates.ts` (or wrapper logic)
- Repository helpers:
  - `apps/backend/src/repositories/AnchorPRRepository.ts` (count/filter by source + batch)

Frontend:
- Event detail model/query/page:
  - `apps/frontend/src/domains/event/model/types.ts`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
- Event domain API query hooks (new mutation)
- i18n copy:
  - `apps/frontend/src/locales/zh-CN.jsonc`
- Admin anchor management split-pool form:
  - `apps/frontend/src/pages/AdminAnchorPRPage.vue`
  - `apps/frontend/src/domains/admin/queries/useAdminAnchorManagement.ts`
- Booking support admin location options may require union pool support:
  - `apps/frontend/src/pages/AdminBookingSupportPage.vue`

## 7) Open Questions / Assumptions to confirm in L1

1. **Cap counting window**
   - Assumption: cap applies to "currently active" user-managed PRs in batch (`status` not `CLOSED/EXPIRED` and visible), not lifetime historical count.

2. **User identity requirement for creation**
   - Assumption: allow creation under existing auth middleware with current local session model (anonymous possible if no strict requirement), but still enforce batch cap.
   - Note: if you want anti-abuse stricter, we should require authenticated local user.

3. **Admin support resource location scope**
   - Assumption: booking-support admin location selectors should include both system-managed and user-managed locations, so resources can target either; booking-specific fields will still be disabled at PR materialization time for user-managed PRs.

4. **Exhaustion semantics**
   - Assumption: event detail should expose user-managed creation availability separately so frontend can avoid misleading "fully exhausted" UX when user-managed creation slots remain.

## 8) L0 Exit

- Codebase seams and risks identified.
- Recommended direction selected for pool split, quota consistency, and booking/resource semantics.
- Ready to draft L1 high-level strategy after your approval.
