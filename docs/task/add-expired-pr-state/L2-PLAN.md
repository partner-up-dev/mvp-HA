# L2 Plan (Low-Level Design)

## Data Model Changes
- Add `expiresAt` to parsed partner request data.
  - Type: `string | null`.
  - Must be ISO 8601 datetime when present.
- Add `expiresAt` column to `partner_requests` table.
  - Type: timestamp (nullable), stored as `timestamp` without timezone (consistent with existing `created_at`).

## Backend Types & Schemas
- `apps/backend/src/entities/partner-request.ts`
  - Extend `parsedPRSchema` with `expiresAt: z.string().datetime().nullable()`.
  - Extend `prStatusSchema` to include `EXPIRED`.
  - Ensure select/insert schemas include `expiresAt`.
  - Update derived types `PRStatus`, `ParsedPartnerRequest`.

## LLM Parse Contract
- `apps/backend/src/services/LLMService.ts`
  - Update parse system prompt to include current datetime and require `expiresAt` as ISO 8601.
  - Guarantee output includes `expiresAt` (nullable) instead of vague natural language.

## Expiration Logic (Lazy on Fetch)
- `PartnerRequestService.getPR(id)`
  - If `expiresAt` exists and `request.status` is `OPEN` or `ACTIVE`, compare with `Date.now()`.
  - If expired, update status to `EXPIRED` via repository and return updated data.
- Do NOT expire in join/exit/update paths per requirement.

## Manual Status Update
- Keep `PATCH /api/pr/:id/status` but restrict input schema to `OPEN | ACTIVE | CLOSED`.
  - Introduce a new schema `prStatusManualSchema` (no `EXPIRED`).

## Repository Updates
- `PartnerRequestRepository.updateStatus` unchanged but accepts new `PRStatus` union.
- Add `updateExpiresAt(id, expiresAt)` only if needed (likely not for this change).

## Frontend Updates
- Update `PRStatus` usages to include `EXPIRED` where status is displayed (badge text & styling).
- `ModifyStatusModal.vue` keeps manual options `OPEN | ACTIVE | CLOSED` only.
- `useUpdatePRStatus.ts` input type remains manual-only.
- `PRPage.vue` and any status checks should treat `EXPIRED` like `CLOSED` (non-joinable).
- Mock RPC to support `EXPIRED` in types and potential responses.

## Docs Updates
- `apps/backend/AGENTS.md`: reflect `EXPIRED` implemented and auto-expire on fetch.
- `apps/frontend/AGENTS.md`: status enum includes `EXPIRED`; manual update excludes it.
- `docs/product/overview.md` and `docs/product/glossary.md` remain aligned but add `expiresAt` detail if needed.
- `docs/h_a_mvp_key_decisions.md` already mentions EXPIRED; ensure terminology matches `expiresAt`.

## Test Plan (L2)
- Backend: fetch PR with `expiresAt` in past -> status becomes `EXPIRED`.
- Backend: fetch PR with future `expiresAt` -> status unchanged.
- Frontend: status badge shows "已过期" (or final wording), no join buttons.

