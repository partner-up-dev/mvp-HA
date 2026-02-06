# L1 Plan (High-Level Strategy)

## Task Name
update-create-partner-request-flow

## Goal Summary
- Home page becomes the NL entry point with an expandable "刚刚我已经在群里发过了？" section that reveals the raw-text create flow.
- Add a new structured create page at `/pr/new` using a shared PartnerRequest Form component (structured fields + PIN).
- Replace `EditContentModal.vue`’s local form with the shared PartnerRequest Form component.
- Use vee-validate for the structured form (and keep existing validation schema alignment).

## Proposed Architecture
- New component: `PartnerRequestForm.vue`
  - Pure structured form (title, type, time, location, partners, budget, preferences, notes, pin).
  - Uses vee-validate + `updateContentValidationSchema` (or a new schema if create requires extra fields).
  - Exposes `@submit` event with normalized fields + pin.
- New component: `NLPRForm.vue`
  - Encapsulates the existing raw-text + pin create flow (current HomePage behavior).
  - Uses existing `createPRValidationSchema`.
- New page: `PRCreatePage.vue` at `/pr/new`
  - Header + main content (PartnerRequestForm) + footer actions (save / create).
- Edit flow: `EditContentModal.vue` uses `PartnerRequestForm` in a modal wrapper; passes initial values and submit handler.

## Data Flow (High-Level)
- Home (NL flow): `NLPRForm` → `useCreatePR()` → `router.push(/pr/:id)`.
- Create page (structured flow): `PartnerRequestForm` → needs create endpoint for structured fields.
- Edit modal: `PartnerRequestForm` → `useUpdatePRContent()`.

## API / Backend Considerations
- Current backend only supports create from raw-text (`POST /api/pr` with `rawText`, `pin`, `nowIso`).
- For `/pr/new` structured create, we need one of:
  1. Add a backend endpoint to create from structured fields (recommended for proper functionality).
  2. Derive a synthetic `rawText` from structured fields (less ideal; implicit behavior).
- I will not implement a backend change without your explicit approval.

## Validation Strategy
- Continue using Zod + VeeValidate schemas in `apps/frontend/src/lib/validation.ts`.
- `PartnerRequestForm` uses a schema aligned with `updateContentValidationSchema`.

## UX Strategy
- Home page:
  - Large title CTA navigates to `/pr/new`.
  - “刚刚我已经在群里发过了？” toggles open the NL textarea section with current copy.
- `/pr/new` page:
  - Header, form body, footer actions ("保存 / 创建" as specified; behavior to be defined in L2).

## Risks / Trade-offs
- Without a structured-create endpoint, `/pr/new` can’t truly create a PR.
- Duplicate validation and form behavior could drift if we don’t centralize logic in `PartnerRequestForm`.

## Open Decisions (Need Approval)
1. Should I implement a backend endpoint for structured create, or should `/pr/new` be UI-only for now?
2. Footer actions on `/pr/new`: should “保存” be a local draft only, or persist remotely?

## Sub-agent Usage
- No sub-agent tool is available in this environment; proceeding without sub-agents.