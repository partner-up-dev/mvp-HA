# Slice 1: Existing Check-In Bug

## Objective

Fix the current PR Page behavior where `我已到场` remains visible after the participant submits check-in feedback.

## Current Data Flow

- Frontend CTA:
  - `apps/frontend/src/domains/pr/ui/sections/PRContextualActions.vue`
  - action key `CHECKIN_ATTENDED`
- Frontend mutation:
  - `apps/frontend/src/domains/pr/use-cases/usePRAttendanceActions.ts`
  - `submitCheckIn(wouldJoinAgain)`
- RPC wrapper:
  - `apps/frontend/src/domains/pr/queries/usePRActions.ts`
  - `client.api.pr[":id"]["check-in"].$post`
- Backend route:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `POST /:id/check-in`
- Backend use case:
  - `apps/backend/src/domains/pr-core/use-cases/check-in.ts`
- Persistence:
  - `apps/backend/src/repositories/PartnerRepository.ts`
  - `reportCheckIn`
- Read model:
  - `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`
  - `buildPRPartnerSection`

## Suspected Cause

`ATTENDED` is correctly treated as an active participant state. The read-model action availability still marks check-in as available after submission. The frontend also renders the check-in CTA for both `CONFIRMED` and `ATTENDED`, so the page can keep presenting the same action after successful submission.

## Implementation Boundary

Expected edits:

- Backend read-model eligibility for `viewer.canCheckIn`.
- Frontend CTA state guard in `PRContextualActions`.
- Backend unit coverage for attended versus confirmed check-in availability.

Out-of-scope edits:

- Questionnaire schema changes.
- Admin UI changes.
- Active participant counting changes for `ATTENDED`.

## Verification Target

- A participant with `ATTENDED` slot state does not receive another check-in action.
- A participant with `CONFIRMED` slot state after event start can still check in.
- The persisted slot has:
  - `status = "ATTENDED"`
  - `didAttend = true`
  - `wouldJoinAgain = true`

## Notes

- This slice should remain small enough to merge independently before the questionnaire system.
- User explicitly requested not to add the full check-in-after-submit scenario test in this slice.
