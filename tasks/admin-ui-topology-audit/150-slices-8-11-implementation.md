# Slices 8-11 - Ownership Split And Cleanup

## Objective & Hypothesis

- Objective: carry the Admin refactor from scaffold consistency into resource ownership cleanup for support resources, POIs, PR management, and retained surfaces.
- Hypothesis: route files should shrink toward assembly while query, mutation, draft, validation, and card layout move into feature modules.

## Guardrails Touched

- Typed input: `Constraint` + `Intent`
- Active mode: `Execute`
- Durable owner:
  - `apps/frontend/src/pages/AdminBookingSupportPage.vue`
  - `apps/frontend/src/pages/AdminBookingExecutionPage.vue`
  - `apps/frontend/src/pages/AdminPoisPage.vue`
  - `apps/frontend/src/domains/admin/ui/support-resource/**`
  - `apps/frontend/src/domains/admin/ui/poi/**`
  - `apps/frontend/src/domains/admin/use-cases/poi/useAdminPoiManagementWorkspace.ts`
  - `apps/frontend/src/domains/admin/ui/pr/**`
  - locale schema and zh-CN copy
- Blast radius:
  - Admin support resource configuration and execution
  - Admin POI basic/review sections
  - Admin PR basic/messages section shell
  - Admin PR messages compatibility surface

## Slice 8 - Support Resource

- Added support-resource rail and section components:
  - `SupportResourceEventRail.vue`
  - `SupportResourceExecutionRail.vue`
  - `SupportResourceConfigSection.vue`
  - `SupportResourceExecutionSection.vue`
- `AdminBookingSupportPage.vue` now owns only Admin shell, navigation, Anchor Event selection, and selected event location projection.
- `SupportResourceConfigSection.vue` owns `useAdminSupportResourceConfig`, editable resources, location validation, and replace-resources command.
- `AdminBookingExecutionPage.vue` now owns shell and search string.
- `SupportResourceExecutionSection.vue` owns `useAdminSupportResourceExecution`, per-PR drafts, submit command, release command, and stats projection back to the rail.

## Slice 9 - POI

- Added:
  - `PoiSelectorRail.vue`
  - `PoiBasicSection.vue`
  - `PoiReviewSection.vue`
  - `useAdminPoiManagementWorkspace.ts`
- `AdminPoisPage.vue` now assembles shell, rail, and active POI section.
- `useAdminPoiManagementWorkspace` owns POI query, mutations, selection state, dirty editor state, and review commands.
- `PoiBasicSection.vue` owns POI basic/gallery/availability Bento cards.
- `PoiReviewSection.vue` owns POI review Bento card content and actions.

## Slice 10 - PR

- Added shared `PRFilterRail.vue`.
- `AdminPRBasicView.vue` and `AdminPRMessagesView.vue` now use `AdminPageScaffold`.
- PR filter UI moved out of both views into `PRFilterRail.vue`.
- Existing PR use-cases remain the command/query owner:
  - `useAdminPRWorkspaceSelection`
  - `useSaveAdminPRBasic`
  - `useAdminPRFeedbackQuestionnaire`
  - `useAdminPRMessagesActions`
- Follow-up candidate: split PR basic form, feedback questionnaire binding, PR message list, and PR message composer into narrower business components.

## Slice 11 - Retained Surface And Locale Cleanup

- Deleted standalone `apps/frontend/src/pages/AdminPRMessagesPage.vue`.
- Kept `/admin/pr-messages` route as a redirect to `admin-pr`.
- Removed locale keys that only served the deleted standalone PR messages page.
- Removed unused `adminPR.generatedPRCount` zh-CN copy.
- Cleaned trailing whitespace from `apps/frontend/src/locales/zh-CN.jsonc`.
- Updated Admin hash scroll behavior so `#pr-basic`, `#pr-messages`, `#poi-basic`, and `#poi-review` act as Admin section state without scrolling the route shell away from the first viewport.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`
  - passed after each implementation group
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - passed
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development`
  - passed
- `git diff --check`
  - passed after locale cleanup
- Browser check at 960px against `https://partner-up.localhost`:
  - `/admin/booking-support` rendered global navigation, route rail, and support resource config content
  - `/admin/booking-execution` rendered global navigation, search/stat rail, and execution content
  - `/admin/pois` rendered POI basic content and rail
  - `/admin/pois#poi-review` rendered POI review content and rail
  - `/admin/pr#pr-basic` rendered PR basic content and shared filter rail at page top after hash-scroll fix
  - `/admin/pr#pr-messages` rendered PR messages content and shared filter rail
  - `/admin/pr-messages` redirected to `/admin/pr`
