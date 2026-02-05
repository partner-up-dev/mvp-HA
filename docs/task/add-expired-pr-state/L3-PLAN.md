# L3 Plan (Implementation Steps)

## Step 1: Update Backend Data Models
- Modify `apps/backend/src/entities/partner-request.ts`
  - Add `expiresAt` to `parsedPRSchema` as ISO 8601 datetime string or null.
  - Add `EXPIRED` to `prStatusSchema`.
  - Ensure inferred types update.

## Step 2: Database Migration
- Add `expires_at` column to `partner_requests` in Drizzle migration.
- Update Drizzle schema in `partner-request.ts` table definition.

## Step 3: LLM Parse Prompt
- Update `apps/backend/src/services/LLMService.ts` system prompt:
  - Provide current datetime.
  - Require `expiresAt` ISO 8601 string or null.
  - Ensure prompt describes scenario-based duration determination.

## Step 4: Lazy Expiration on Fetch
- Update `PartnerRequestService.getPR`:
  - If status is OPEN/ACTIVE and `parsed.expiresAt` is set and `<= now`, update status to EXPIRED and return updated record.
  - Otherwise return original record.

## Step 5: Manual Status Update Restriction
- Introduce `prStatusManualSchema` for controller validation (OPEN/ACTIVE/CLOSED).
- Keep service `updatePRStatus` for manual updates unchanged but only accepts manual schema at controller layer.

## Step 6: Frontend Updates
- `StatusBadge.vue` add label and styling for EXPIRED.
- `PRPage.vue` treat EXPIRED as non-joinable (already handled by status check).
- `ModifyStatusModal.vue` keep options OPEN/ACTIVE/CLOSED only.
- `useUpdatePRStatus.ts` type remains manual-only.
- `mock-rpc.ts` types extended for EXPIRED.

## Step 7: Docs Updates
- Update `apps/backend/AGENTS.md` and `apps/frontend/AGENTS.md` to reflect EXPIRED implemented + lazy expiry on fetch.
- Update `docs/product/overview.md` / `docs/product/glossary.md` if needed to mention `expiresAt` as parsed field.

## Step 8: Tests
- If existing test harness exists, add unit tests for `getPR` expiry behavior.
- Otherwise, validate via local call patterns / simple script (optional) and remove any temp script before final output.

## Output
- Write `docs/task/add-expired-pr-state/RESULT.md` summarizing changes and tests.
