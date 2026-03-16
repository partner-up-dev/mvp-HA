# L1 Plan - High-Level Strategy (Anchor User-Managed Location PR Creation)

## 0) L0 Decisions Applied

From your confirmation, L1 is based on:

1. Cap counts active PRs (not lifetime historical count).
2. Creation requires WeChat authentication (same auth gate as Anchor join).
3. `08b6fb0` review feedback overrides pool strategy to **A1 explicit split**.
4. User-facing copy should not expose "system-managed vs user-managed" internals.
5. Cap rule update: **cap is per (batch, location)**; different locations can have different cap values.
6. No source-based booking/resource enforcement; admin config remains the single source of truth for booking rules.

## 1) Architectural Intent

Goal: introduce controlled user-side Anchor PR creation without destabilizing existing admin/system generation paths.

Principles:
- Keep existing "system side" flow behavior unchanged by default.
- Add new capability as additive schema/API fields.
- Enforce quota server-side with concurrency safety.
- Keep frontend language neutral; expose only actionable states (enabled/disabled + reason).

## 2) Proposed Topology

```text
Frontend (AnchorEventPage)
  ├─ GET /api/events/:eventId
  │    └─ returns batches + existing PRs + creation options for selected-batch usage
  └─ POST /api/events/:eventId/batches/:batchId/anchor-prs
       (WeChat-auth required)
       └─ create user-origin Anchor PR at selected location

Backend
  controllers/anchor-event.controller.ts
    ├─ getAnchorEventDetail(...)
    └─ createUserAnchorPR(...)

  domains/anchor-event/use-cases/
    ├─ get-event-detail.ts (adds location option availability metadata)
    └─ create-user-anchor-pr.ts (new)

  domains/pr-booking-support/services/
    └─ materialize-pr-support-resources.ts
         (existing materialization, no source-specific booking override)

  entities + migration
    ├─ anchor_events: split to system_location_pool + user_location_pool
    └─ anchor_partner_requests: add location_source
```

## 3) Data Contract Strategy

### 3.1 Anchor Event data model

Use explicit split (A1):

- `systemLocationPool: string[]`
- `userLocationPool: Array<{ id: string; perBatchCap: number }>`

Rationale:
- Strong domain clarity (no naming ambiguity).
- Supports location-specific cap values directly.
- Acceptable migration scope because product is pre-launch.

### 3.2 Anchor PR subtype metadata

Add `locationSource` on `anchor_partner_requests`:
- `SYSTEM`
- `USER`

Rationale:
- Stable semantics even if event pools are edited later.
- Supports origin-aware quota/audit/analytics without changing booking rule engine semantics.

## 4) API Strategy

### 4.1 Event detail response extension

`GET /api/events/:eventId` adds batch-oriented creation option metadata (neutral language):

- `batches[].locationOptions[]` with:
  - `locationId`
  - `remainingQuota`
  - `disabled`
  - `disabledReason` (`MAX_REACHED` | `NONE`)

Important:
- Only options intended for user creation are returned here.
- Existing PR list remains unchanged.
- UI does not need to explain internal pool type.

### 4.2 New creation endpoint

Add:
- `POST /api/events/:eventId/batches/:batchId/anchor-prs`
  - request: `{ locationId: string }`
  - auth: requires valid WeChat OAuth session (same guard as anchor join)

Behavior:
- Validate event/batch relation.
- Validate location is allowed in creation options.
- Enforce location-specific cap for the given batch.
- Create Anchor PR with `locationSource=USER`.
- Materialize support resources using existing admin-configured rules.

Response:
- created PR id and canonical path data needed for frontend redirect.

## 5) Quota Enforcement Strategy

Quota definition:
- For a fixed `(batchId, locationId)`, max active PR count is `perBatchCap` configured on that location.
- Active = visible and status not in `{CLOSED, EXPIRED}`.

Consistency:
- Use DB transaction + advisory transaction lock (serialize creations per batch).
- Perform count and insert inside same transaction.
- If reached cap, return conflict (HTTP 409) with machine-readable reason.

## 6) Booking/Resource Policy Strategy

For `locationSource=USER` PR creation:
- Do not apply source-based booking overrides.
- Keep current booking/resource materialization semantics unchanged.
- Booking requirements, booking deadlines, and resource support are fully controlled by admin-configured event templates + batch overrides.

Result:
- Avoids dual-rule complexity by keeping one booking rule system (admin rules) for all Anchor PR origins.

## 7) Frontend UX Strategy (Neutral Terminology)

In `AnchorEventPage` selected batch section:
- Keep existing PR list.
- Append one creation card at list end.
- Card contains:
  - location selector from `selectedBatch.locationOptions`
  - locations at cap shown disabled with reason text: `max reached`
  - explicit pre-submit notice: booking/resource rules follow current location/resource configuration
  - create action triggers WeChat auth check then calls POST endpoint

No explicit system/user pool labels shown to users.

## 8) Admin Surface Strategy

Admin Anchor Event editor:
- Split event-level inputs into two editable sets:
  - `systemLocationPool`
  - user creation location pool with per-location cap

Admin Booking Support page:
- location selectors use union of system + user location sets, and booking behavior is configured manually by admin rules.

## 9) Risk Review and Doubt Notes (Point 4)

Concern:
- Hiding pool semantics can reduce explainability when users ask why some locations are not selectable.

Mitigation under your direction:
- Do not expose internal terms.
- Always provide deterministic disabled reason (`max reached`) at option level.
- Keep behavior predictable: if option appears, it is creatable unless disabled by quota.

This keeps UX simple while avoiding silent failure patterns.

## 10) Dependencies / Build Impact

Likely touched packages:
- `apps/backend`: entities, migrations, repositories, domain use-cases, controller, exported types.
- `apps/frontend`: event query/model/page + i18n + admin anchor form + admin booking-support location union.

Build expectation:
- Workspace type updates required because frontend RPC inferred types will change.

## 11) L1 Exit

High-level architecture is ready and consistent with your updated constraints.

Next: L2 low-level design (exact interfaces, payload fields, domain function signatures, validation/error shapes, and algorithm-level rules).
