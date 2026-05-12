# Candidate Execution Slices

## Slice 1: Admin Navigation Model

Goal:

- replace hard-coded flat Admin navigation with a data-driven grouped `AdminNavigationPanel` that supports route and route-section targets.

Address and Object:

- `apps/frontend/src/domains/admin/ui/navigation/adminNavigationModel.ts`
- `apps/frontend/src/domains/admin/ui/navigation/AdminNavigationPanel.vue`
- `apps/frontend/src/domains/admin/ui/composites/AdminNavigationCard.vue`
- Admin locale keys

State Diff:

- flat ChoiceCard list -> grouped navigation panel with route/section active state

Blast Radius Forecast:

- all protected Admin pages that render the current navigation card
- locale schema and zh-CN copy

Verification:

- frontend typecheck/build
- inspect all Admin routes for navigation active state

Preflight locale decision:

- either keep `adminCommon.navPRMessages` as retained compatibility copy, or remove it with the retained PR messages surface cleanup
- move or add `generatedPRCount` under `adminPRMessages` if `AdminPRMessagesPage.vue` remains in source during this slice
- keep retired `adminBookingSupport.batchOverrides*` keys for a separate cleanup slice unless the user confirms same-slice locale cleanup

Target navigation groups:

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

## Slice 2: Anchor Event Section Orchestrator Trial

Goal:

- introduce the section orchestrator + BentoLayout + business component pattern on one Anchor Event section.

Recommended pilot section:

- `活动标签`

Why:

- published preference tag pool and pending preference tag review already have a clean resource boundary
- query and mutation ownership can move into business components without broad Anchor Event full-object update coupling
- the section naturally validates the rule that card containers belong to the orchestrator

Address and Object:

- `apps/frontend/src/domains/admin/ui/anchor-event/sections/AnchorEventTagsSection.vue`
- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventPreferenceTagPoolEditor.vue`
- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventPendingPreferenceTagsContent.vue`
- `apps/frontend/src/pages/AdminAnchorEventPage.vue`

State Diff:

- page-local tag panel -> section orchestrator with BentoLayout and business-owned tag queries/mutations

Blast Radius Forecast:

- Anchor Event tags section only
- Admin anchor-event preference tag queries and mutations

Verification:

- frontend build
- token lint if layout styling changes
- browser check for published tag edit and pending tag publish/reject affordances

## Slice 3: Anchor Event Fine-Grained Update Use-Cases

Goal:

- create narrower frontend use-cases for Anchor Event full-object updates before decomposing basic, locations, time, and other sections.

Target use-cases:

- `useUpdateAnchorEventBasic`
- `useUpdateAnchorEventLocations`
- `useUpdateAnchorEventTime`
- `useUpdateAnchorEventJoinGate`
- `useUpdateAnchorEventFeedbackQuestionnaire`

Address and Object:

- `apps/frontend/src/domains/admin/use-cases/anchor-event/`
- `apps/frontend/src/domains/admin/queries/useAdminAnchorEvents.ts`
- Anchor Event section/component files introduced during decomposition

State Diff:

- business components assembling full `AdminAnchorEventInput` -> business components calling slice-owned update use-cases

Blast Radius Forecast:

- Anchor Event edit mutation behavior
- anchor-event workspace cache invalidation
- PR workspace cache invalidation where Anchor Event edits affect PR defaults or generated PR data

Verification:

- frontend build
- focused smoke checks for basic save, location save, time save, join gate save, and feedback questionnaire save

## Slice 4: Admin Page Scaffold Trial

Goal:

- introduce `AdminPageScaffold` with left primary workspace and fixed-width right context rail.

Recommended pilot page:

- `AdminFeedbackQuestionnairesPage.vue`

Why:

- small page
- clear entity selector + editor split
- low cross-surface mutation complexity

Address and Object:

- `apps/frontend/src/domains/admin/ui/layout/AdminPageScaffold.vue`
- `apps/frontend/src/domains/admin/ui/layout/AdminBentoGrid.vue`
- `apps/frontend/src/domains/admin/ui/layout/AdminContextRail.vue`
- `apps/frontend/src/pages/AdminFeedbackQuestionnairesPage.vue`

State Diff:

- generic `DesktopPageScaffold` with page-local aside -> Admin-specific two-column scaffold with left operator column and right workspace

Blast Radius Forecast:

- pilot page layout and styles
- no backend contract changes

Verification:

- frontend build
- browser screenshot at desktop and mobile widths
- confirm left operator column scroll behavior and no incoherent overlap

## Slice 5: Admin Panel And Form Layout Primitives

Goal:

- reduce repeated Admin `.panel`, `.section-header`, `.grid`, `.field`, `.hint`, and action styles.

Address and Object:

- `apps/frontend/src/domains/admin/ui/layout/AdminPanel.vue`
- `apps/frontend/src/domains/admin/ui/layout/AdminSectionHeader.vue`
- `apps/frontend/src/domains/admin/ui/layout/AdminDirtyActionBar.vue`
- pilot page and one medium page

State Diff:

- page-local Admin shell styles -> domain-owned Admin shell components

Blast Radius Forecast:

- pages migrated in this slice
- visual consistency across Admin panels

Verification:

- frontend build
- token lint if style tokens change
- browser screenshot checks for migrated pages

## Slice 6: Shared Admin Selection Use Case

Goal:

- extract repeated raw-id selection and fallback-first behavior.

Address and Object:

- `apps/frontend/src/domains/admin/use-cases/shared/useAdminEntitySelection.ts`
- pilot usage in feedback questionnaire or booking support page

State Diff:

- page-local `selectedXRaw` / typed id / current record / watcher patterns -> one typed selection helper

Blast Radius Forecast:

- selection state in migrated pages

Verification:

- frontend build
- focused browser checks for default selection and create-new sentinel behavior

## Slice 7: PR And Anchor Event Editor Decomposition

Goal:

- reduce largest page files by moving editor state and workflow orchestration into feature components and use-cases.

Address and Object:

- `AdminPRPage.vue`
- `AdminAnchorEventPage.vue`
- new Admin use-cases under feature folders:
  - `domains/admin/use-cases/pr`
  - `domains/admin/use-cases/anchor-event`
- new Admin section orchestrators and business components under `domains/admin/ui`

State Diff:

- monolithic route page workflows -> route assembly plus feature editors

Blast Radius Forecast:

- highest Admin behavior risk
- PR workspace cache invalidation
- anchor-event workspace cache invalidation
- user-facing PR/detail cache invalidation for edited PRs

Verification:

- frontend build
- Admin PR create/edit/status/visibility/message smoke checks
- Admin anchor-event edit/time-pool/landing/preference-tag smoke checks

Boundary rules:

- `*Section.vue` files own BentoLayout/card shells/shared actions
- business components use `*Content.vue`, `*Editor.vue`, `*Picker.vue`, or `*Composer.vue`
- business components own query/mutation hooks when the resource boundary is independently meaningful
- broad Anchor Event full-object updates are accessed through finer frontend use-cases

## High-Level Confirmation Needed

Recommended defaults:

1. Navigation groups:
   - 活动管理
   - PR 管理
   - 支持资源
   - POIs 管理
   - 反馈问卷
2. Global Admin navigation and route-context modules share the left operator column.
3. First scaffold pilot: `AdminFeedbackQuestionnairesPage.vue`.
4. PR messages remain embedded under PR 管理 for now; retained standalone page becomes cleanup scope after PR migration.
5. Admin composables use feature folders with shared helpers under `domains/admin/use-cases/shared`.
