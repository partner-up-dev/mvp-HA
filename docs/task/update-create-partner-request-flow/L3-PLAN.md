# L3 Plan (Implementation Plan)

## Task Name
update-create-partner-request-flow

## Scope
- Implement backend API split for structured vs NL create.
- Introduce `DRAFT` status create behavior.
- Replace frontend create/edit forms with shared `PartnerRequestForm` + standalone `NLPRForm`.
- Remove mock RPC path and validate via E2E + BDD against real backend.

## Execution Roadmap

1. Backend status and schema updates
- Files:
  - `apps/backend/src/entities/partner-request.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
- Changes:
  - Add `DRAFT` to `prStatusSchema`.
  - Add create request schemas:
    - Structured create body with `fields`, `pin`, `status`.
    - NL create body with `rawText`, `pin`, `nowIso`.
  - Add NL word-count validation (`<= 50` words).
- Validation:
  - Build backend TypeScript.

2. Backend service split and create logic
- Files:
  - `apps/backend/src/services/PartnerRequestService.ts`
- Changes:
  - Rename existing NL create to `createPRFromNaturalLanguage`.
  - Add `createPRFromStructured`.
  - Structured create sets `partners[1] = 0`.
  - Structured create writes deterministic fallback `rawText`.
  - Allow `updatePRContent` when status is `OPEN` or `DRAFT`.
- Validation:
  - Unit/integration tests for create and edit guards.

3. Frontend query layer split
- Files:
  - `apps/frontend/src/queries/useCreatePR.ts` (or split into two files)
- Changes:
  - Add `useCreatePRFromNaturalLanguage` -> `/api/pr/natural_language`.
  - Add `useCreatePRFromStructured` -> `/api/pr`.
  - Keep typed response `{ id }`.
- Validation:
  - Typecheck frontend.

4. Validation rewrite (frontend)
- Files:
  - `apps/frontend/src/lib/validation.ts`
- Changes:
  - Rebuild schema module with backend schema reuse.
  - Export:
    - `createNaturalLanguagePRValidationSchema`
    - `partnerRequestFormValidationSchema`
    - typed payloads for hooks/components.
- Validation:
  - Typecheck + component compile.

5. Shared form components
- Files:
  - `apps/frontend/src/components/PartnerRequestForm.vue` (new)
  - `apps/frontend/src/components/NLPRForm.vue` (new)
- Changes:
  - `PartnerRequestForm`:
    - structured fields + PIN only
    - `vee-validate` integration
    - submit emit payload `{ fields, pin }`
  - `NLPRForm`:
    - raw text + PIN
    - submit to NL create mutation
- Validation:
  - Component-level interaction test or smoke render.

6. Page and modal integration
- Files:
  - `apps/frontend/src/pages/HomePage.vue`
  - `apps/frontend/src/pages/PRCreatePage.vue` (new)
  - `apps/frontend/src/components/EditContentModal.vue`
  - `apps/frontend/src/router/index.ts`
- Changes:
  - Home:
    - equal-level CTA row + NL toggle row
    - expandable `NLPRForm`
  - Create page:
    - header/main/footer
    - `Save` => status `DRAFT`
    - `Create` => status `OPEN`
  - Edit modal:
    - reuse `PartnerRequestForm` and existing update mutation.
  - Router:
    - add `/pr/new`.
- Validation:
  - Manual flow sanity via local run.

7. Remove mock RPC path
- Files:
  - app bootstrap/wiring files referencing `VITE_USE_MOCK`
  - `apps/frontend/src/lib/mock-rpc.ts` references
  - docs mentioning mock mode
- Changes:
  - Remove runtime mock switching.
  - Keep only real RPC client transport.
- Validation:
  - App boot and API calls work against backend.

8. Status and UX compatibility updates
- Files:
  - `apps/frontend/src/components/StatusBadge.vue`
  - any status-driven gates in `apps/frontend/src/pages/PRPage.vue`
- Changes:
  - Add `DRAFT` display mapping.
  - Ensure create/edit/join behavior is not regressed by new status.
- Validation:
  - Typecheck + targeted scenario checks.

9. Tests (E2E + BDD + build checks)
- Backend:
  - run backend test suite.
- Frontend:
  - run typecheck/build/tests.
- E2E/BDD:
  - scenario 1: home NL create
  - scenario 2: structured create save (`DRAFT`)
  - scenario 3: structured create publish (`OPEN`)
  - scenario 4: edit existing PR via shared form
- Commands:
  - use workspace `pnpm` scripts only.

10. Documentation updates
- Files:
  - `AGENTS.md`
  - `apps/frontend/AGENTS.md`
  - `docs/task/update-create-partner-request-flow/RESULT.md`
- Changes:
  - update current capabilities/limitations to include:
    - `/pr/new` structured flow
    - NL endpoint split
    - `DRAFT` behavior
    - mock mode removal
    - E2E/BDD coverage added

## Pseudo-code Boundaries

### Structured create submit (`/pr/new`)
1. Parent page receives submit payload from `PartnerRequestForm`.
2. Parent decides action status by clicked footer button.
3. Call `useCreatePRFromStructured.mutateAsync({ fields, pin, status })`.
4. On success, navigate `/pr/:id`.

### NL create submit (home panel)
1. `NLPRForm` validates `rawText` + `pin`.
2. Call `useCreatePRFromNaturalLanguage.mutateAsync({ rawText, pin, nowIso })`.
3. On success, navigate `/pr/:id`.

## Risks and Mitigations
- Risk: `DRAFT` accidentally enters join/active transitions.
  - Mitigation: keep join logic requiring `OPEN`/`ACTIVE` and test `DRAFT` non-join path.
- Risk: backend/frontend schema drift.
  - Mitigation: frontend validation imports backend schema shape.
- Risk: endpoint migration breaks existing home create.
  - Mitigation: switch home query to new NL endpoint in same change set.

## Rollout and Verification
1. Complete backend changes and tests.
2. Complete frontend form/routing changes.
3. Remove mock path.
4. Run full test/build/E2E.
5. Update docs and `RESULT.md`.

