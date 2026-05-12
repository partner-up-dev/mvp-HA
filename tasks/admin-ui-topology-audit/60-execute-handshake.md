# Execute Handshake - Admin UI Shell Slice 1

## Current Slice

Active mode:

- `Solidify`

Typed input:

- `Constraint`
- `Artifact`

Implementation should begin only after user confirmation.

## Recommended First Execute Slice

Start with `Slice 1: Admin Navigation Model`.

Reason:

- It addresses the flat Admin IA pressure across every protected Admin page.
- It creates the business-object second-level navigation model before page layout migration.
- It gives later `AdminPageScaffold` work a stable global navigation owner.
- It can preserve current route URLs while adding section metadata.

## High-Level Decisions To Confirm

Recommended defaults:

1. Navigation groups:
   - 活动管理
     - 活动基本信息
     - 活动场地
     - 活动时间
     - 活动标签
     - 其它
   - PR 管理
     - PR 基本
     - PR 留言
   - 支持资源
     - 资助配置
     - 资助执行
   - POIs 管理
     - POI 基本
     - POI 审核
   - 反馈问卷
     - 反馈问卷模板
2. Global Admin navigation sits outside the future fixed-width right context rail.
3. First scaffold pilot after navigation: `AdminFeedbackQuestionnairesPage.vue`.
4. PR system messages appear as `PR 管理 / PR 留言` in the navigation model and target the active PR route section.
5. Retained `AdminPRMessagesPage.vue` cleanup is deferred until the PR management migration.
6. Locale cleanup policy:
   - keep `adminCommon.navPRMessages` as retained compatibility copy during navigation work
   - add or move `adminPRMessages.generatedPRCount` if retained `AdminPRMessagesPage.vue` stays in source
   - leave `adminBookingSupport.batchOverrides*` cleanup to a later booking support cleanup slice

## Impact Handshake

Address and Object:

- `apps/frontend/src/domains/admin/ui/navigation/adminNavigationModel.ts`
- `apps/frontend/src/domains/admin/ui/navigation/AdminNavigationPanel.vue`
- `apps/frontend/src/domains/admin/ui/composites/AdminNavigationCard.vue`
- `apps/frontend/src/domains/admin/use-cases/shared/useAdminEntitySelection.ts` in the later selection slice
- `apps/frontend/src/locales/schema.ts`
- `apps/frontend/src/locales/zh-CN.jsonc`
- protected Admin pages that currently import `AdminNavigationCard`

State Diff:

- From: hard-coded flat `ChoiceCard` navigation inside `AdminNavigationCard`.
- To: data-driven grouped Admin navigation with second-level route or route-section entries and active state.

Blast Radius Forecast:

- Visual shell changes across all protected Admin pages.
- Locale schema and zh-CN copy for Admin navigation labels.
- Section ids introduced for anchor-event, PR, POI, support resource, and feedback questionnaire surfaces.
- Router URLs, route names, Admin auth guard, and Admin query behavior stay stable.

Invariants Check:

- Existing Admin routes remain valid:
  - `/admin/anchor-events`
  - `/admin/pr`
  - `/admin/booking-support`
  - `/admin/booking-execution`
  - `/admin/pois`
  - `/admin/feedback-questionnaires`
- `/admin/pr-messages` remains a redirect alias to `admin-pr`.
- Logout behavior remains owned by `useAdminAccess`.
- Query side effects remain outside `AdminNavigationPanel`.
- Admin composables migrate toward feature folders; first navigation slice records the target shape and keeps broad composable moves for dedicated extraction slices.

Verification:

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Browser check for each protected Admin route at desktop width.
- Browser check at narrow width for grouped navigation wrapping/collapse behavior.

## Source Recheck Notes

Rechecked source state on 2026-05-11:

- `apps/frontend/src/app/router.ts` still defines the same protected Admin routes and the `admin-pr-messages` redirect.
- All protected Admin pages still import `AdminNavigationCard`.
- `AdminFeedbackQuestionnairesPage.vue` remains the smallest active protected Admin page and still fits the first scaffold pilot after navigation.
- `AdminBookingSupportPage.vue` page copy uses event-level resources while retired batch override locale keys remain in schema and zh-CN copy.
- `AdminPRPage.vue` uses `ConfirmDialog` for PR deletion and still uses `window.confirm` for message deletion.
- Admin query modules still repeat `readErrorMessage` and cache invalidation calls.
- Current line-count baseline uses `Get-Content.Count`: `AdminAnchorEventPage.vue` 1593, `AdminPRPage.vue` 1485, `AdminPoisPage.vue` 1212, `AdminBookingExecutionPage.vue` 936, `AdminPRMessagesPage.vue` 489, `AdminFeedbackQuestionnairesPage.vue` 488, `AdminBookingSupportPage.vue` 410, `AdminLoginPage.vue` 212.
- `AdminPRMessagesPage.vue` calls `adminPRMessages.generatedPRCount`; current zh-CN copy places `generatedPRCount` under `adminPR`, and `schema.ts` lacks `adminPRMessages.generatedPRCount`.
