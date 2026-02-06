# L0 Plan (Analysis & Context)

## Task Name
update-create-partner-request-flow

## Request Deconstruction
- Update the home page create flow.
- Large title 找搭子一起 <Something>（轮换） should jump to a form page when tapped.
- 刚刚我已经在群里发过了？ should expand a textarea with current behavior: 复制过来，自然语言自动识别.
- The complex form needs a shared implementation:
  - Unify EditContentModal.vue to use the incoming partner request form.
  - Introduce vee-validate (likely to that form flow).

## Current Behavior (Observed)
- HomePage.vue currently contains the create PR flow: Vee-validate form with rawText + pin and uses useCreatePR().
- EditContentModal.vue has a separate structured form for partner request fields (title, type, time, location, partners, budget, prefs, notes, pin) with local state and manual validation.
- DateTimeRangePicker.vue is used in EditContentModal to manage time.
- Validation schemas already exist in apps/frontend/src/lib/validation.ts:
  - createPRValidationSchema for rawText + pin.
  - updateContentValidationSchema for structured fields + pin.

## Relevant Files / Patterns
- Home create flow: apps/frontend/src/pages/HomePage.vue
- Edit flow: apps/frontend/src/components/EditContentModal.vue
- Validation schemas: apps/frontend/src/lib/validation.ts
- Input components: apps/frontend/src/components/PRInput.vue, PINInput.vue
- Routing: apps/frontend/src/router/index.ts

## Architecture & Trade-offs (Initial Thoughts)
- Introduce a new create form page (route) so home can become a landing page with call-to-action.
- Create a shared PartnerRequest form component with a configurable mode:
  - Create (raw-text NL input + pin)
  - Edit (structured fields + pin)
  - Possibly a toggle/expand section for 已在群里发过 which reveals the NL textarea.
- Reuse Vee-validate and the existing Zod schemas to avoid duplicating validation logic.
- Ensure the shared form can be used both in a page and inside a modal (for EditContentModal).

## Risks / Unknowns
- The phrase incoming partner request form is ambiguous; unclear if there is a new design spec or component expected.
- Route naming (e.g. /create, /new, /pr/new) needs confirmation to avoid conflicts.
- UX details for the 轮换 large title and the expansion behavior need clarification.

## Clarifying Questions (Needed)
1. What exact route/path should the new form page use? (e.g. /create, /new, /pr/new)
2. What is the intended structure of the incoming partner request form? Is it just the existing structured fields from EditContentModal.vue, or a new design/spec?
3. Should the raw-text 复制过来，自然语言自动识别 section be optional in the new form page only, or also in EditContentModal.vue?
4. Should the home page still allow creating a request directly, or strictly be a landing page that navigates to the form page?

## Sub-agent Usage
- No sub-agent tools are available in this environment; will proceed without sub-agents unless you want me to simulate delegation with separate sections.
