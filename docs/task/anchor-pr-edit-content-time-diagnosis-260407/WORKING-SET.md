# Anchor PR Edit Content Time Diagnosis Working Set

## Task Name

`anchor-pr-edit-content-time-diagnosis-260407`

## Goal

Diagnose why:

- creator can update Anchor PR status
- creator cannot submit Anchor PR content edit because the modal confirm button stays disabled

Record:

- confirmed root cause chain
- product clarification discovered during diagnosis
- tactical hotfix direction for urgent release
- full repair direction for later contract cleanup

## Scope Anchors

### Frontend

- `anchor-pr-detail > actions > edit-content modal > confirm button > disabled`
- `anchor-pr-detail > actions > edit-content modal > form > time field`
- `community-pr-detail > actions > edit-content modal > form`

### Backend

- `pr-anchor > controller > /api/apr/:id/content > creator mutation`
- `anchor-event > create-user-anchor-pr > batch time propagation`
- `admin-anchor-management > batch edit > timeWindow input contract`

## In Scope

- creator edit-content enablement diagnosis
- Anchor PR content form validity chain
- Anchor PR time source and propagation path
- hotfix options that unblock release without changing Anchor PR time semantics

## Out Of Scope

- PRD / Product TDD promotion
- comprehensive backend time-contract rewrite in this packet
- changing Anchor PR business rule to allow arbitrary time edits

## Product Clarification Captured In This Round

Anchor PR content edit should not allow arbitrary time mutation.

Expected rule:

- Anchor PR time is derived from the selected event batch
- creator may edit status and content fields such as title/type/location/bounds/preferences/notes
- creator should not edit time directly inside Anchor PR content edit
- if batch/time reassignment is needed later, it should be handled as a separate batch-scoped operation, not Community PR style freeform time editing

This clarification is recorded here as volatile task truth for follow-up work. It is not promoted yet.

## Confirmed Findings

### 1. This is not a backend creator-permission failure

- Anchor PR status update succeeds for the creator.
- Anchor PR content update endpoint also authorizes creator mutation when the request is in an editable status.
- Therefore the blocking symptom occurs before the request is sent.

Relevant code:

- `apps/backend/src/controllers/anchor-pr.controller.ts`
- `apps/backend/src/domains/pr-core/services/creator-mutation-auth.service.ts`
- `apps/backend/src/domains/pr-core/use-cases/update-pr-content.ts`

### 2. The content modal confirm button is gated entirely by frontend form validity

`EditPRContentModal.vue` disables confirm with `:disabled="!isFormValid"`.

`isFormValid` reads `PRForm.canSubmit`, which is `meta.valid` from `vee-validate`.

Relevant code:

- `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
- `apps/frontend/src/domains/pr/ui/forms/PRForm.vue`

### 3. Shared PR form validation still validates `time`

The shared form schema requires:

- `type` non-empty
- `minPartners >= 2`
- `maxPartners >= minPartners` when present
- `time` entries must match either:
  - `YYYY-MM-DD`
  - strict datetime accepted by `z.string().datetime()`

This means the Anchor content modal can be invalid even though time is not supposed to be editable for Anchor PR.

Relevant code:

- `apps/frontend/src/lib/validation.ts`

### 4. User-created Anchor PR copies batch time directly into the PR

`create-user-anchor-pr.ts` writes:

- `type: event.type`
- `time: batch.timeWindow`

So any batch time formatting inconsistency propagates into the Anchor PR detail payload and then back into the edit form.

Relevant code:

- `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`

### 5. Batch time currently has no strict backend-standardized input contract on the admin path

Current admin batch editing behavior:

- frontend uses plain text inputs for batch start/end
- backend accepts `timeWindow` as `z.string().nullable()` tuple

So the system can store time strings that are valid for current runtime behavior but invalid for the shared frontend edit-form schema.

Relevant code:

- `apps/frontend/src/pages/AdminAnchorPRPage.vue`
- `apps/backend/src/controllers/admin-anchor-management.controller.ts`

### 6. Shared `DateTimeRangePicker` emits a local no-timezone datetime shape

`DateTimeRangePicker.vue` currently builds datetime strings like:

- `YYYY-MM-DDTHH:mm`

That shape is not accepted by the shared frontend schema's `z.string().datetime()` branch.

This creates a broader contract mismatch even outside this immediate Anchor bug.

Relevant code:

- `apps/frontend/src/domains/pr/ui/forms/DateTimeRangePicker.vue`
- `apps/frontend/src/lib/validation.ts`

## Root Cause Summary

The release-blocking symptom is caused by a frontend domain mismatch:

1. Anchor PR content edit reuses the shared Community-style `PRForm`.
2. The shared form still validates `time`.
3. Anchor PR edit should not expose time editing at all.
4. Existing Anchor PR time values can originate from batch strings that are not guaranteed to satisfy the shared form's strict time validation.
5. The modal therefore opens in an invalid state and the confirm button remains disabled before any request is sent.

## Tactical Hotfix Direction

For the urgent release, prefer the smallest fix that matches the clarified product rule:

1. Anchor content edit must stop exposing the time field.
2. Anchor content edit must stop validating time in the shared form path.
3. Anchor content submit must preserve the original PR time unchanged.
4. Community PR create/edit behavior must remain unchanged.

Recommended implementation shape:

- add an Anchor-specific form mode or prop on `PRForm`
- hide the time editor when the form is used for Anchor content edit
- use a validation schema variant that excludes time validation for that Anchor edit mode
- keep `fields.time` in the submit payload as the original value from detail, unchanged

Why this is the preferred hotfix:

- it fixes the user-visible blocker
- it aligns with clarified product behavior
- it avoids risky last-minute time normalization that could shift semantics
- it does not require full backend contract cleanup before release

## Full Repair Track After Release

The broader system still has a time-format contract problem and should be repaired later with backend as source of truth.

Target direction:

1. define one backend-standard time contract for `time` / `timeWindow`
2. normalize all frontend submit paths to that backend contract
3. stop emitting local no-timezone datetime strings from shared frontend components
4. add compatibility normalization for legacy stored values on read
5. keep Anchor PR and Community PR form rules separated where the domain rules differ

## Open Questions For Full Repair

1. What exact backend datetime standard should be canonical for non-date values:
   - UTC ISO 8601 with `Z`
   - another explicit offset-based ISO contract
2. Which existing stored batch/PR rows already contain local no-timezone datetime strings?
3. Does future Anchor batch reassignment need a dedicated operation and UI surface?

## Current Recommendation

Ship the tactical Anchor-only hotfix first.

Do not use the urgent fix as a reason to keep the shared time contract inconsistent long-term.

## Implemented In This Round

The urgent release fix has been implemented on the frontend.

Delivered behavior:

1. Anchor PR content edit no longer exposes the time field.
2. Anchor PR content edit no longer blocks submit because of time-format validation.
3. Community PR create/edit still uses the original time-enabled shared form behavior.
4. Anchor content submit continues to carry the original time value unchanged.

Changed files:

- `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
- `apps/frontend/src/domains/pr/ui/forms/PRForm.vue`
- `apps/frontend/src/lib/validation.ts`

Verification completed:

- `pnpm --filter @partner-up-dev/frontend build`

## Follow-Up Finding After Hotfix

The frontend-only hotfix removed the disabled button state, but it did not fully restore successful Anchor content editing.

New confirmed failure path:

1. Anchor content modal can now submit.
2. `useUpdateAnchorPRContent()` still sends `fields.time` to `/api/apr/:id/content`.
3. Backend `updateContentSchema` still validates `fields` with the full `partnerRequestFieldsSchema`.
4. That backend schema still requires `time` entries to satisfy:
   - `YYYY-MM-DD`
   - strict `z.string().datetime()` values
5. Existing Anchor PR rows can still carry batch-derived time strings outside that backend-standard format.
6. The request is therefore rejected by backend validation before the controller use-case runs.

Relevant code:

- `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
- `apps/backend/src/entities/partner-request.ts`
- `apps/backend/src/controllers/pr-controller.shared.ts`

Implication:

- the previous hotfix solved the frontend gating symptom only
- the actual urgent production fix still needs one more Anchor-specific boundary change:
  - either normalize outgoing Anchor `time` to backend contract before submit
  - or stop requiring/sending mutable `time` in the Anchor content update route

Preferred immediate direction remains:

- Anchor content edit should not be a time-editing flow
- so the cleaner fix is to align the request contract with that rule instead of keeping full shared time validation in the Anchor content mutation path
