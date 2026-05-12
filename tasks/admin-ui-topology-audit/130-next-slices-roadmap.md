# Next Slices Roadmap - Scaffold And Ownership

## Why This Roadmap Changed

The Admin refactor has two separate problem lines:

1. Admin shell and layout need a stable operator workspace model.
2. Admin business ownership still needs repair where pages or large views hold query, mutation, draft, validation, and workflow details.

The scaffold work improves page structure, but it does not by itself fix the deeper ownership problem. A page can render `BentoLayout` and still keep the business boundary in the route page or route view. The next slices therefore track both scaffold migration and query / mutation owner alignment.

## Current Principles

- `AdminPageScaffold` owns Admin operator shell layout.
- The Admin shell has two columns: a left operator column and a right workspace.
- The left operator column contains global Admin navigation plus route-context modules shared across second-level views.
- Route-context modules include Anchor Event selection, PR filters, POI selection, support-resource selectors / stats, and feedback questionnaire template selection.
- Route pages trend toward route assembly, auth/logout handoff, and selected route section resolution.
- Section orchestrators own `BentoLayout`, card allocation, card titles, descriptions, shared action placement, and section-level loading / empty / error coordination.
- Business components own business content and local draft / validation / query / mutation state when the API resource boundary matches the component boundary.
- Feature use-cases hide broad mutation assembly where the backend still exposes a coarse endpoint.
- Using `BentoItem` in a page is only a layout improvement. It is not a completed ownership split.

## Width Contract For AdminPageScaffold

- `<901px`: stack the left operator column above the right workspace.
- `901px+`: keep a two-column shell with a consistent left operator column and a flexible right workspace.
- The left operator column contains navigation and route context together at every desktop and medium width.
- The right workspace contains the header and active second-level section content.

This contract comes from the real `agent-browser` review on `https://partner-up.localhost/admin/feedback-questionnaires`, where 1069px and 960px should preserve the corrected 1280px behavior.
It also incorporates the later PR / Anchor Event review where PR filters, Anchor Event selection, and similar cross-second-level modules belong in the same left operator column as global navigation.

## Next Slices

### Slice 6: Admin Scaffold Stabilization + Feedback / Booking Pages Migration

Goal:

- Finish the scaffold line for one small page and two support-resource pages.

Scope:

- Stabilize `AdminPageScaffold` and durable docs around the width contract.
- Keep `AdminFeedbackQuestionnairesPage.vue` on `AdminPageScaffold`.
- Migrate `AdminBookingSupportPage.vue` to `AdminPageScaffold`.
- Migrate `AdminBookingExecutionPage.vue` to `AdminPageScaffold`.
- Extract light shared shell components such as `AdminContextRail` or `AdminPanel` only if repeated container styles become clear across the three pages.

Boundary:

- Preserve current query, mutation, draft, and save behavior unless a small movement is required by the layout.
- This slice validates scaffold behavior across configuration and operations pages.
- This slice does not claim full query / mutation ownership repair.

Verification:

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development`
- `agent-browser` real-page checks for:
  - `/admin/feedback-questionnaires`
  - `/admin/booking-support`
  - `/admin/booking-execution`
- Widths:
  - 960px
  - 1280px
  - 1600px
- Check:
  - no horizontal overflow
  - global navigation remains left-column at 960px
  - route-local rail does not compress the main workspace at medium widths
  - wide desktop rail scroll behavior remains bounded

### Slice 7: Admin Query / Mutation Ownership Audit

Goal:

- Produce a current owner map for every Admin route and identify where query / mutation ownership should move.

Scope:

- Audit:
  - `AdminAnchorEventPage.vue`
  - `AdminPRPage.vue`
  - `AdminBookingSupportPage.vue`
  - `AdminBookingExecutionPage.vue`
  - `AdminPoisPage.vue`
  - `AdminFeedbackQuestionnairesPage.vue`
  - retained `AdminPRMessagesPage.vue`
- For each route, classify:
  - page-owned route assembly
  - section orchestrator responsibilities
  - business component responsibilities
  - query owner
  - mutation owner
  - draft / dirty-state owner
  - retained or duplicate surfaces

Output:

- A task packet owner matrix.
- Ordered implementation slices for support-resource, POI, PR, and cleanup work.

Verification:

- No product-code mutation required.
- Findings should reference concrete files and symbols.

### Slice 8: Support Resource Ownership Split

Goal:

- Repair ownership in support-resource configuration and execution after scaffold migration.

Target:

- `AdminBookingSupportPage.vue`
- `AdminBookingExecutionPage.vue`
- `apps/frontend/src/domains/admin/use-cases/support-resource/`
- new `apps/frontend/src/domains/admin/ui/support-resource/**`

Direction:

- Configuration page:
  - route page owns route assembly and selected Anchor Event id
  - route rail owns event selection and summary
  - section orchestrator owns Bento card allocation and save action placement
  - business editor owns resource rows, local draft, validation, and save interaction through the support-resource config use-case
- Execution page:
  - route rail owns search, stats, and filters
  - section orchestrator owns pending queue and audit card allocation
  - business components own pending item list, execution submission content, release action content, and audit content
  - mutations stay in support-resource execution use-case or move into business components when the command boundary is one component-owned resource

Verification:

- Frontend typecheck/build/token lint.
- Browser checks for resource config edit/save affordance and execution list/action affordances.

### Slice 9: POI Ownership Split

Goal:

- Move POI management from page-level Bento usage to section orchestrators and business components.

Target:

- `PoiBasicSection`
- `PoiReviewSection`
- POI selector/content components:
  - POI selector
  - basic editor
  - gallery editor
  - capacity editor
  - meeting point editor
  - availability rules editor
  - review content/actions

Owner rule:

- Keep `useAdminPoiEditor` as the dirty draft owner for local unsaved edits and server-refresh merge behavior.
- Review actions may be owned by the review business component or a narrow POI review use-case because publish/reject map to a clean resource command boundary.

Verification:

- Typecheck/build/token lint.
- Browser checks for `#poi-basic` and `#poi-review`.
- Confirm server refresh does not overwrite local dirty draft.

### Slice 10: PR Ownership Split

Goal:

- Reduce `AdminPRBasicView.vue` and `AdminPRMessagesView.vue` into route section views plus section orchestrators and business components.

Target:

- `PRBasicSection`
- `PRMessagesSection`
- PR selector / filters
- PR basic editor
- PR status / visibility editor
- PR feedback questionnaire binding
- PR delete action
- PR message list
- PR message composer

Owner rule:

- PR basic save can stay behind `useSaveAdminPRBasic`.
- Feedback questionnaire binding can stay behind `useAdminPRFeedbackQuestionnaire`.
- PR message list and composer should own or directly call the PR message query/mutation surface because that is an independently meaningful PR-scoped resource.

Verification:

- Typecheck/build/token lint.
- Browser checks for `/admin/pr#pr-basic` and `/admin/pr#pr-messages`.
- Confirm only selected second-level menu item is active.

### Slice 11: Retained Surface And Locale Cleanup

Goal:

- Remove or formally retain obsolete Admin compatibility surfaces.

Scope:

- Decide fate of `AdminPRMessagesPage.vue`.
- Clean retained locale keys.
- Clean `zh-CN.jsonc` trailing whitespace that currently blocks global `git diff --check`.
- Update task docs after cleanup.

Verification:

- `git diff --check` should become globally meaningful again.
- Typecheck/build/token lint.
