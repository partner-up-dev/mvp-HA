# Slice 5 - Admin Page Scaffold Pilot

## Objective & Hypothesis

- Objective: Introduce the Admin-specific page scaffold and migrate one low-risk Admin route to validate the layout contract.
- Hypothesis: `AdminPageScaffold` should separate global Admin navigation from route-local context rail, leaving the main workspace for section orchestrators and Bento layout.

## Guardrails Touched

- Typed input: `Constraint` + `Intent`
- Active mode: `Execute`
- Durable owner:
  - `apps/frontend/src/domains/admin/ui/layout/AdminPageScaffold.vue`
  - `apps/frontend/src/pages/AdminFeedbackQuestionnairesPage.vue`
  - `tasks/admin-ui-topology-audit/40-target-admin-shell-contracts.md`
- Blast radius:
  - Admin shell layout behavior
  - Admin feedback questionnaire template management route

## Decisions

- Add `AdminPageScaffold` under the Admin domain UI layout folder because its layout semantics are Admin-operator-specific.
- Keep global Admin navigation in a dedicated `navigation` slot outside the route-local right rail.
- Use the right rail for feedback questionnaire template selection and create action.
- Use `BentoLayout` / `BentoItem` for the feedback questionnaire editor workspace.
- Preserve existing feedback questionnaire query, draft, JSON parsing, create, and update behavior.
- Later correction: `160-admin-two-column-shell-correction.md` supersedes the right-rail placement decision. The `#rail` slot now means left-column route context inside the shared Admin operator column.

## Implementation Notes

- `AdminPageScaffold.vue` provides:
  - navigation slot
  - header slot
  - main workspace slot
  - fixed-width contextual rail slot on wide desktop
  - stacked layout on narrower viewports
  - independent rail scrolling when the rail is side-by-side
- `AdminFeedbackQuestionnairesPage.vue` now uses:
  - `AdminNavigationPanel` in the scaffold navigation slot
  - template selector in the rail slot
  - feedback questionnaire editor inside one full-span Bento item
- Follow-up after real-browser review:
  - The initial `minmax(0, 1fr) + 380px` content grid rendered at 1280px and compressed the editor workspace to about 524px.
  - The scaffold now keeps the route-local rail stacked above the main workspace below 1500px.
  - The rail becomes side-by-side only at 1500px and above, where the editor workspace still has enough width for JSON editing.
  - The global Admin navigation keeps its left-column desktop behavior down to 901px, so 1069px and 960px match the corrected 1280px behavior.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`
  - passed
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - passed with no findings outside baseline
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development`
  - passed
- `git diff --check`
  - passed
- Playwright mocked-API browser check against `http://localhost:4001/admin/feedback-questionnaires`
  - desktop viewport rendered `AdminPageScaffold`, `AdminNavigationPanel`, right rail, Bento workspace, save action, and template selector
  - desktop layout measured navigation/workspace columns and workspace/rail columns; rail used `overflow-y: auto`
  - mobile viewport collapsed layout and content to one column; rail used visible overflow
  - no Vite compile overlay appeared
- `agent-browser` real page check against `https://partner-up.localhost/admin/feedback-questionnaires`
  - logged in with local seed credentials
  - at 1280px, before follow-up fix: content columns were `524px 380px`, and textarea width was about `458px`
  - at 1280px, after follow-up fix: content uses one workspace column, rail width is about `936px`, main width is about `936px`, and textarea width is about `870px`
  - at 1440px, content still uses one workspace column and textarea width is about `1030px`
  - at 1600px, content expands to side-by-side rail with columns about `784px 380px`
  - at 1069px, global layout remains left navigation plus workspace with columns about `280px 725px`
  - at 960px, global layout remains left navigation plus workspace with columns about `280px 616px`
