# Slice 4 - PR, Support Resource, And POI Admin Refactor

## Objective & Hypothesis

- Objective: Move PR 管理, 支持资源, and POIs 管理 toward the Anchor Event admin organization model.
- Hypothesis: Each surface should expose section-level frontend use-cases and section orchestrators that own Bento card allocation, while business components own business content and local query / mutation state where the write boundary is local.

## Guardrails Touched

- Typed input: `Intent` + `Constraint`
- Active mode: `Execute`
- Durable owner:
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `apps/frontend/src/pages/AdminPRPage.vue`
  - `apps/frontend/src/pages/AdminBookingSupportPage.vue`
  - `apps/frontend/src/pages/AdminBookingExecutionPage.vue`
  - `apps/frontend/src/pages/AdminPoisPage.vue`
  - `apps/frontend/src/domains/admin/ui/**`
  - `apps/frontend/src/domains/admin/use-cases/**`
- Blast radius:
  - Admin PR basic and message management
  - Admin support-resource configuration and execution
  - Admin POI basic and review management

## Decisions

- PR 管理:
  - Keep `/admin/pr#pr-basic` and `/admin/pr#pr-messages` as the durable route section model.
  - Use PR's existing backend granular endpoints for content, status, visibility, feedback questionnaire, messages, create, and delete.
  - Add PR admin use-case facades for basic save, feedback questionnaire binding / materialization, and PR message actions.
  - Split PR basic and PR messages into separate route content views rather than two cards mounted by one page body.
- 支持资源:
  - Keep configuration and execution as separate route pages because their data owners and endpoint contracts differ.
  - Configuration remains event-owned full replace.
  - Execution remains runtime workspace plus PR-level commands.
  - Add support-resource admin use-case facades for config replacement and execution actions.
- POIs 管理:
  - Keep `/admin/pois#poi-basic` and `/admin/pois#poi-review`.
  - Extract one POI editor state owner before splitting UI further, because the current dirty-state and server-refresh merge logic is a real consistency boundary.
  - Add POI admin action facade for upsert, publish, and reject commands.

## Implementation Notes

- `AdminPRPage.vue` now switches between `AdminPRBasicView.vue` and `AdminPRMessagesView.vue`.
- `AdminPRBasicView.vue` owns PR create/edit/delete, feedback-questionnaire binding, and the PR selector for that workflow.
- `AdminPRMessagesView.vue` owns PR message list/create/edit/delete and the PR selector for that workflow.
- Shared PR filtering and selection query state lives in `useAdminPRWorkspaceSelection`.
- `AdminBookingSupportPage.vue` and `AdminBookingExecutionPage.vue` now use `BentoLayout` / `BentoItem` as section orchestrators.
- `AdminPoisPage.vue` now uses `BentoLayout` / `BentoItem` for POI basic, gallery, availability rules, and POI review.
- POI dirty draft ownership moved into `useAdminPoiEditor` so local unsaved edits and server refresh merge stay in one owner.
- Added admin use-case modules:
  - `apps/frontend/src/domains/admin/use-cases/pr/`
  - `apps/frontend/src/domains/admin/use-cases/support-resource/`
  - `apps/frontend/src/domains/admin/use-cases/poi/`

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development` passed.
- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit` still fails on the existing unrelated blocker:
  - `src/domains/pr/use-cases/usePRCreateFlow.ts(57,20): error TS2349: This expression is not callable. Type 'never' has no call signatures.`
- Browser check:
  - `http://localhost:4001/admin/pr#pr-basic` loads without Vite compile overlay.
  - `http://localhost:4001/admin/pr#pr-messages` loads without Vite compile overlay.
  - Full admin section rendering was blocked by local database credentials: seeded login shown in the UI returned `Invalid admin credentials`.
