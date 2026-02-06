# L2 Plan (Low-Level Design)

## Task Name
update-create-partner-request-flow

## Confirmed Decisions
- Home has two equal-level rows:
  - Row 1: CTA navigation to `/pr/new` with right-arrow.
  - Row 2: toggle row for NL input expansion with chevron.
- `PartnerRequestForm` is a pure structured form (fields + PIN), no mode, no action buttons.
- API split:
  - `POST /api/pr` for structured create.
  - `POST /api/pr/natural_language` for NL create.
- `/pr/new` footer actions:
  - `Save` creates with status `DRAFT`.
  - `Create` creates with status `OPEN`.
- Remove mock RPC usage and run only end-to-end + BDD tests.

## Backend Design

### Entity and Schema
- File: `apps/backend/src/entities/partner-request.ts`
- Extend `prStatusSchema` with `DRAFT`.
- Keep `prStatusManualSchema` unchanged (`OPEN`, `ACTIVE`, `CLOSED`).
- Add create schemas:
  - Structured: `{ fields: partnerRequestFieldsSchema, pin, status: z.enum(["DRAFT", "OPEN"]) }`
  - Natural language: `{ rawText, pin, nowIso }` plus word-count guard (`<= 50` words).

### Service
- File: `apps/backend/src/services/PartnerRequestService.ts`
- Split create methods:
  - `createPRFromStructured(fields, pin, status)`
  - `createPRFromNaturalLanguage(rawText, pin, nowIso)`
- Structured create behavior:
  - Normalize `partners[1]` to `0`.
  - Persist status as provided (`DRAFT` or `OPEN`).
  - Persist a deterministic `rawText` summary for compatibility with existing sharing surfaces.
- Edit behavior:
  - Allow `updatePRContent` for status `OPEN` and `DRAFT`.

### Controller Routes
- File: `apps/backend/src/controllers/partner-request.controller.ts`
- Change:
  - `POST /api/pr` -> structured create.
  - `POST /api/pr/natural_language` -> NL create.

## Frontend Design

### Validation Rewrite
- File: `apps/frontend/src/lib/validation.ts`
- Rebuild schemas by reusing backend exports where possible:
  - Import backend `partnerRequestFieldsSchema`.
  - Compose frontend form schemas with localized messages and strict PIN rules.
- Exports:
  - `createNaturalLanguagePRValidationSchema`
  - `partnerRequestFormValidationSchema`
  - typed input/output aliases.

### Shared Structured Form
- New file: `apps/frontend/src/components/PartnerRequestForm.vue`
- Responsibilities:
  - Render structured fields + PIN.
  - Use `vee-validate` and `partnerRequestFormValidationSchema`.
  - Emit submit payload `{ fields, pin }`.
  - Accept prefill via `initialFields`.
- Exclusions:
  - No footer action buttons.

### NL Form Component
- New file: `apps/frontend/src/components/NLPRForm.vue`
- Encapsulates NL create fields (`rawText`, `pin`) and submit behavior.
- Uses `createNaturalLanguagePRValidationSchema`.
- Calls NL endpoint (`POST /api/pr/natural_language`).

### New Create Page
- New file: `apps/frontend/src/pages/PRCreatePage.vue`
- Layout:
  - Header.
  - Main with `PartnerRequestForm`.
  - Footer with two actions:
    - `Save` -> structured create with `DRAFT`.
    - `Create` -> structured create with `OPEN`.
- On success:
  - Add ID to creator store.
  - Navigate to `/pr/:id`.

### Edit Modal Refactor
- File: `apps/frontend/src/components/EditContentModal.vue`
- Replace local form implementation with `PartnerRequestForm`.
- Keep modal chrome and update mutation in modal.

### Home Page Layout
- File: `apps/frontend/src/pages/HomePage.vue`
- Top section:
  - CTA row (`/pr/new`) with right-arrow.
  - NL toggle row with chevron.
- Expanded content:
  - `NLPRForm`.
- Keep created list section below.

### Router and Query Hooks
- File: `apps/frontend/src/router/index.ts`
  - Add `/pr/new`.
- Query hooks:
  - `useCreatePRFromNaturalLanguage` -> `POST /api/pr/natural_language`.
  - `useCreatePRFromStructured` -> `POST /api/pr`.
  - Update call sites.

### Remove Mock RPC
- Remove `VITE_USE_MOCK` runtime branching and related mock transport integration.
- Remove or retire `apps/frontend/src/lib/mock-rpc.ts` usages in app boot path.

## Compatibility and Side Effects
- Update status rendering components for `DRAFT`.
- Ensure PR detail action gating handles `DRAFT` safely.
- Keep status transitions for join/exit logic unchanged for non-draft records.

## Test Plan
- Backend tests:
  - Structured create returns 201 with expected `DRAFT`/`OPEN`.
  - NL create enforces 50-word limit.
  - Content update allowed for `DRAFT`.
- Frontend integration tests:
  - Home CTA navigation and NL expand/collapse behavior.
  - `/pr/new` action buttons send correct status.
  - Edit modal uses shared form and submits correctly.
- E2E and BDD:
  - NL create flow from home.
  - Structured create flow (`Save` and `Create`).
  - Edit flow through shared structured form.
  - All scenarios run against real backend only.

