# 03 - Rejoin Row Reuse

## Goal

When the same user rejoins the same PR after `EXITED` or `RELEASED`, reuse the existing partner row instead of creating a new row.

## Why

Current behavior can create multiple rows for one user in one PR (for example `EXITED` + `JOINED`), which complicates role judgment and user understanding.

## Design

1. Repository capability
- Add repository method to fetch latest row for `(prId, userId)` regardless of status.
- Keep active lookup method for fast active checks.

2. Join use-case behavior
- On join:
  - if active row exists (`JOINED/CONFIRMED/ATTENDED`), keep current idempotent behavior.
  - else if historical row exists (`EXITED/RELEASED`), reactivate same row by status transition.
  - else create new row.

3. Reactivation semantics
- Reactivation to `JOINED`:
  - clear release/exit timestamps and stale check-in fields.
- Reactivation to `CONFIRMED` (join within confirmation window):
  - set `confirmedAt` consistently.
- Keep event/outbox/operation-log semantics intact.

4. Backward compatibility
- Existing duplicate historical rows are tolerated for now.
- Optional follow-up (separate issue): one-time data cleanup for old duplicates.

## Files (expected)

- `apps/backend/src/repositories/PartnerRepository.ts`
- `apps/backend/src/domains/pr-core/use-cases/join-pr.ts`
- `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts` (only if dedupe/view logic needs guardrails)

## Acceptance Criteria

- Rejoin no longer creates an additional partner row when a historical row already exists for that user+PR.
- Viewer state and roster rendering remain correct.
- Active-count semantics are unchanged.
- Build passes.

## Risk

- Medium-high. Touches lifecycle behavior in join flow and row-transition semantics.

## Validation Checklist

- Join -> Exit -> Rejoin (should reuse same partnerId)
- Join -> Auto release -> Rejoin (should reuse same partnerId)
- Join inside confirmation window (reactivation to `CONFIRMED` works)
- Event page count and PR detail count remain consistent
