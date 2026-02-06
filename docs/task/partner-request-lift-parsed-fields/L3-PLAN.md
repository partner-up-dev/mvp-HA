# L3 Plan (Implementation Plan)

## Approach
Implement schema, API, and UI changes end-to-end with dev reset migration. Update documentation at the end.

## Steps
1. Backend schema + types
   - Update `apps/backend/src/entities/partner-request.ts`:
     - Remove `parsedPRSchema` and `ParsedPartnerRequest`.
     - Add top-level field schemas (`title`, `type`, `time`, `location`, `expiresAt`, `budget`, `preferences`, `notes`, `partners`).
     - Update `partnerRequests` table definition with new columns (remove `parsed`, `participants`).
     - Update `partnerRequestSummarySchema` to top-level fields.
     - Update insert/select schemas accordingly.

2. Backend services/repository/controllers
   - Update `PartnerRequestRepository`:
     - Replace `updateParsed` with `updateFields` (top-level set).
     - Replace `incrementParticipants`/`decrementParticipants` with `updatePartners` helper.
   - Update `PartnerRequestService`:
     - Use top-level fields for create/update responses and joins.
     - Replace `participants` logic with `partners` tuple logic.
     - Remove `normalizeParsedExpiresAt`.
     - Update `getPRSummariesByIds` fields.
   - Update `partner-request.controller.ts` schemas and handler to accept top-level fields.

3. Backend LLMService
   - Update parse schema and return type to top-level fields.
   - Update share prompt builders for `type`, `time`, and `partners` min/max.

4. Frontend updates
   - `apps/frontend/src/lib/validation.ts`: new top-level schema + update content schema.
   - Replace all `parsed.*` usages with top-level fields:
     - `PRPage.vue`, `PRCard.vue`, `SharePR.vue`, `ShareToXiaohongshu.*`, `ShareToWechat.*`, `CreatedPRList.vue`, `EditContentModal.vue`, etc.
   - Update join eligibility logic to use `partners` tuple.
   - Update mock RPC data shape.

5. Migration
   - Add new drizzle migration SQL to drop/recreate `partner_requests` with new columns.
   - Ensure `drizzle` schema matches new definition.

6. Docs
   - Update `AGENTS.md`, `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md` to reflect new top-level fields and renamed concepts.

## Pseudocode Sketch

### Join eligibility
```
min, current, max = partners
if max != null and current >= max: reject
newCurrent = current + 1
if min != null and newCurrent >= min and status == OPEN: set ACTIVE
```

### Exit
```
newCurrent = max(0, current - 1)
if min != null and newCurrent < min and status == ACTIVE: set OPEN
```

## Test Plan
- Backend: call create PR -> ensure response has top-level fields; check join/exit updates `partners` and status transitions.
- Frontend: load PR page, verify fields render; edit content modal updates with new shape; join/exit buttons enable/disable correctly.
- Run relevant scripts if available:
  - `pnpm --filter apps/backend db:generate` (if needed)
  - `pnpm --filter apps/backend db:migrate`
  - `pnpm --filter apps/frontend typecheck` (if script exists)

