# Refactor Smells And UX Opportunities

## User-Stated Drivers

- Boundary repair:
  - reduce route pages owning reusable Admin workflow logic
  - reduce page-local layout and style duplication
  - enforce clearer domain Admin UI boundaries
- DRY repair:
  - shared Admin shell
  - shared Admin page layout
  - shared list/detail/editor composition patterns where contracts are stable
- UX scaling:
  - navigation should support more management modules through second-level groups
  - high-density Admin workflows need predictable two-column task layouts
  - operators should keep selection/context visible while editing or reviewing details

## Current Bad Smells

### P0: Admin Route Pages Are Overloaded

Observed pressure:

- `AdminAnchorEventPage.vue`: 1593 lines
- `AdminPRPage.vue`: 1485 lines
- `AdminPoisPage.vue`: 1212 lines
- `AdminBookingExecutionPage.vue`: 936 lines

Issue:

- route entry files own page shell, sidebar content, form state, validation, parsing, derived selectors, mutation calls, loading/error handling, and dense scoped styles.

Refactor direction:

- keep pages as route assembly only
- move reusable feature logic into Admin domain use-cases or section components
- move stable section shells into Admin domain UI components

Concrete high-pressure splits:

- `AdminAnchorEventPage.vue`
  - extract `useAdminAnchorEventEditor`
  - extract `useAdminLandingConfigEditor`
  - extract `useAdminPreferenceTagsEditor`
  - split UI into event info, time-pool config, landing config, and preference-tag panels
- `AdminPRPage.vue`
  - extract `useAdminPREditor`
  - extract `useAdminPRSelection`
  - extract `useAdminPRMessagesEditor`
  - split UI into filters, content form, feedback, policy/status/visibility, and messages panels
- `AdminPoisPage.vue`
  - extract `useAdminPoiEditor`
  - split UI into gallery, meeting point, capacity, review, and availability-rules editors

### P0: Admin Navigation Is A Flat Card

Observed surface:

- `AdminNavigationCard.vue` lists every Admin route in one vertical sequence.
- Admin already spans anchor-event config, PR operations, booking config, booking execution, POIs, and feedback questionnaires.

Issue:

- flat navigation will degrade as more modules arrive.
- operational tasks, configuration tasks, content/data-library tasks, and compatibility aliases have no IA separation.

Refactor direction:

- replace the card pattern with `AdminNavigationPanel`.
- introduce second-level grouped menu items.
- derive active state from route name.
- support group expansion, collapsed mobile behavior, and route metadata.

### P0: Existing Desktop Scaffold Has The Wrong Column Bias For Admin

Observed surface:

- `DesktopPageScaffold` uses left aside `280px-340px` and right main content.
- The requested Admin model needs left content to own the broad bento workspace and right column to own a fixed-width contextual panel.

Issue:

- current `DesktopPageScaffold` treats navigation as the left column and content as the right column.
- Admin workflows increasingly need persistent context/detail tools while the main workspace remains broad.

Refactor direction:

- introduce Admin-specific layout under `domains/admin/ui`, since the shell has Admin workflow semantics.
- keep `DesktopPageScaffold` available for generic desktop pages.

### P1: Page-Local Form And Panel Styles Are Repeated

Observed patterns:

- `.panel`, `.card-title`, `.section-header`, `.field`, `.field-label`, `.field-input`, `.grid`, `.stack`, `.hint` repeat across Admin pages.

Issue:

- style drift is already visible across pages with similar Admin semantics.
- repeated local CSS makes future density/responsiveness changes expensive.

Refactor direction:

- create Admin domain layout primitives:
  - `AdminPanel`
  - `AdminSectionHeader`
  - `AdminBentoGrid`
  - `AdminContextPanel`
  - `AdminToolbar`
- keep generic field primitives in `shared/ui/forms` when contracts are cross-domain.

### P1: Selection And Detail Workflows Are Locally Reimplemented

Observed workflows:

- anchor-event selection in anchor-event management, booking support, and retained PR messages page
- PR selection and details in PR management and booking execution
- POI selection and editor in POI management
- template selection and editor in feedback questionnaire management

Issue:

- list/detail/edit pages repeat the same control flow: load workspace, choose item, derive draft, validate draft, submit mutation, reload/refresh.

Refactor direction:

- extract Admin-specific use-cases per feature family.
- use shared selection/detail layout components after route-specific state is separated.
- add `useAdminEntitySelection` for raw string id, typed id, current record, fallback first item, create sentinel, and cascaded selection.
- organize Admin composables by functional area folders so anchor-event, PR, support resources, POIs, feedback questionnaire, and session logic have clear local ownership.

### P1: Query Modules Carry Use-Case Weight

Observed surface:

- `useAdminPRManagement.ts` contains input DTOs, many mutations, and repeated cross-surface invalidation.
- Admin query files repeat `readErrorMessage`.

Issue:

- query files act as RPC wrappers and workflow orchestration at the same time.
- cache invalidation policy is duplicated and hard to audit.

Refactor direction:

- keep query modules as thin Hono RPC + TanStack Query wrappers.
- move save orchestration and cache impact helpers into `domains/admin/use-cases`.
- add `domains/admin/queries/admin-query-utils.ts` for error payload reading, id serialization, and common admin invalidation helpers.

### P1: Legacy / Retained Surfaces Add Confusion

Observed surfaces:

- `/admin/pr-messages` redirects to `/admin/pr`.
- `AdminPRMessagesPage.vue` remains as a standalone implementation.
- `useAdminAnchorManagement.ts` remains as a query re-export barrel.
- `adminCommon.navPRMessages` remains in locale schema and zh-CN copy while the current navigation card omits that entry.
- `adminBookingSupport.batchOverrides*` locale keys remain in schema and zh-CN copy while the current booking support page centers on event-level resources.
- `AdminPRMessagesPage.vue` calls `adminPRMessages.generatedPRCount`; current zh-CN copy places `generatedPRCount` under `adminPR`, and `schema.ts` lacks the `adminPRMessages.generatedPRCount` contract.

Issue:

- retained code makes topology harder to reason about.
- retained locale keys and misplaced locale keys make translation contracts harder to audit.

Refactor direction:

- during implementation planning, decide whether to remove retained page code or keep it as a documented compatibility artifact.
- before or during the navigation slice, decide whether retained locale keys are active compatibility surface or cleanup scope.

### P2: Admin System Message Logic Is Duplicated

Observed surface:

- `AdminPRPage.vue` and retained `AdminPRMessagesPage.vue` both implement system-message composer behavior.

Issue:

- trim, empty-value guard, mutation call, error placement, and successful draft reset are repeated.

Refactor direction:

- extract `useAdminPRSystemMessageComposer(prId)`.
- render a shared `AdminPRMessagesPanel` in PR management.

### P2: Confirmation UX Is Split

Observed surface:

- Admin PR page uses `ConfirmDialog` for PR deletion.
- Message deletion still uses `window.confirm`.

Issue:

- destructive actions have inconsistent interaction, styling, and test surface.

Refactor direction:

- route destructive Admin actions through `ConfirmDialog` or a small `useConfirmAction` helper.

## UX Opportunities

### Navigation IA

Candidate group model:

- `活动管理`
  - 活动基本信息
  - 活动场地
  - 活动时间
  - 活动标签
  - 其它
- `PR 管理`
  - PR 基本
  - PR 留言
- `支持资源`
  - 资助配置
  - 资助执行
- `POIs 管理`
  - POI 基本
  - POI 审核
- `反馈问卷`
  - 反馈问卷模板

Route grouping can evolve ahead of URL changes. Existing URLs can remain stable while the navigation model gains structure.

This target model treats some second-level items as page sections inside a current route. `AdminNavigationPanel` should represent route-level and section-level targets with one data model.

### Page Layout

Superseded candidate operator model:

- left column:
  - broad primary workspace
  - bento layout for lists, editors, previews, stats, and result panels
- right column:
  - fixed width contextual rail
  - independently scrollable
  - holds navigation, selected item summary, filters, quick actions, or anchor-event/entity picker depending on route

Current operator model after PR / Anchor Event review:

- left operator column:
  - global Admin navigation
  - route-context modules shared across second-level views, such as entity pickers, filters, stats, and quick actions
- right workspace:
  - page header
  - active second-level business section content

### Workflow Density

Admin pages should optimize for repeat operation:

- keep entity selection visible
- keep save/destructive actions close to the edited object
- show current filters and selected entity in a stable location
- reduce long vertical scrolling inside the main workspace by using bento cards with clear section hierarchy
- keep context and secondary controls in the shared left operator column when they are reused across second-level views

## Initial Migration Order

1. Add Admin shell primitives without moving business behavior.
2. Replace `AdminNavigationCard` usage with `AdminNavigationPanel` and second-level menu data.
3. Introduce `AdminPageScaffold` and move one low-risk page first, likely `AdminFeedbackQuestionnairesPage.vue` or `AdminBookingSupportPage.vue`.
4. Extract common Admin panel, bento, entity selector, and confirmation primitives.
5. Migrate medium-complexity pages:
   - `AdminFeedbackQuestionnairesPage.vue`
   - `AdminBookingSupportPage.vue`
   - `AdminBookingExecutionPage.vue`
6. Migrate high-pressure pages:
   - `AdminPoisPage.vue`
   - `AdminPRPage.vue`
   - `AdminAnchorEventPage.vue`
7. Split retained compatibility surfaces after active routes are stable.
