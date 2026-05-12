# Target Admin Shell Contracts

## Proposed Component Ownership

Admin-specific shell components should live under:

```text
apps/frontend/src/domains/admin/ui/
|-- layout/
|   |-- AdminPageScaffold.vue
|   |-- AdminBentoGrid.vue
|   |-- AdminContextRail.vue
|   |-- AdminPanel.vue
|   |-- AdminSectionHeader.vue
|   |-- AdminEntitySelectorPanel.vue
|   `-- AdminDirtyActionBar.vue
`-- navigation/
    |-- AdminNavigationPanel.vue
    |-- AdminSecondaryNav.vue
    `-- adminNavigationModel.ts
```

Rationale:

- the shell encodes Admin workflow semantics
- second-level menu groups are Admin IA, not generic shared UI
- `AdminPageScaffold` has operator-workspace behavior, not a general desktop layout contract

## Section Orchestrator Contract

Admin feature sections should have a section orchestrator layer.

Responsibilities:

- own `BentoLayout` usage
- allocate business components into cards
- own card titles, descriptions, spans, and action slots
- place shared action components such as save, publish, reject, delete, refresh, and dirty-state controls
- pass minimal context to business components
- coordinate section-level loading, empty, error, and dirty states when several business components participate in one section

Naming:

- section orchestrators use `*Section.vue`
- examples:
  - `AnchorEventLocationsSection.vue`
  - `AnchorEventTimeSection.vue`
  - `AnchorEventOtherSection.vue`
  - `PRMessagesSection.vue`
  - `PoiReviewSection.vue`

Business component contract:

- render business content only
- own query and mutation hooks when the resource boundary matches the component boundary
- own local draft, validation, loading, empty, error, and dirty state for its business surface
- emit stable coordination events only when the orchestrator needs them
- use content-focused names such as `*Content.vue`, `*Editor.vue`, `*Picker.vue`, and `*Composer.vue`
- reserve `Panel`, `Card`, `Tile`, `Section`, and `Layout` naming for container and orchestrator layers

## AdminNavigationPanel Contract

Responsibilities:

- render top-level Admin menu groups
- render second-level route entries
- compute active state from current route name
- support route links, disabled/future entries, and optional badges/counts later
- render top-level groups as an accordion; second-level entries are visible only when the group is expanded
- keep the active route group expanded by default
- enforce a max-height boundary and internal scroll for long navigation content
- expose logout action in a stable footer/header slot

Candidate groups:

```ts
type AdminNavigationGroup = {
  id: string;
  labelKey: string;
  items: AdminNavigationItem[];
};

type AdminNavigationItem = {
  id: string;
  labelKey: string;
  routeName: string;
  sectionId?: string;
  hash?: string;
  exact?: boolean;
};
```

Initial group model:

- `活动管理`
  - 活动基本信息: `admin-anchor-events`, section `anchor-event-basic`
  - 活动场地: `admin-anchor-events`, section `anchor-event-locations`
  - 活动时间: `admin-anchor-events`, section `anchor-event-time`
  - 活动标签: `admin-anchor-events`, section `anchor-event-tags`
  - 其它: `admin-anchor-events`, section `anchor-event-other`
- `PR 管理`
  - PR 基本: `admin-pr`, section `pr-basic`
  - PR 留言: `admin-pr`, section `pr-messages`
- `支持资源`
  - 资助配置: `admin-booking-support`
  - 资助执行: `admin-booking-execution`
- `POIs 管理`
  - POI 基本: `admin-pois`, section `poi-basic`
  - POI 审核: `admin-pois`, section `poi-review`
- `反馈问卷`
  - 反馈问卷模板: `admin-feedback-questionnaires`

Open product decision:

- whether future URL groups should follow `/admin/events/*`, `/admin/prs/*`, `/admin/booking/*`, and `/admin/content/*`.
- whether section targets use hash anchors, local tab state, or router query in the first implementation slice.

## AdminSecondaryNav Contract

Responsibilities:

- render page-local sections after a route has enough internal surfaces to need a second level.
- support tabs or anchor links depending route shape.
- keep global Admin IA separate from page-local section navigation.

Initial page section examples:

- Anchor Event:
  - 活动基本信息
  - 活动场地
  - 活动时间
  - 活动标签
  - 其它
- PR:
  - PR 基本
  - PR 留言
- POI:
  - POI 基本
  - POI 审核

## Admin Composable Organization Contract

Admin composables should be grouped by functional area. Candidate ownership:

```text
apps/frontend/src/domains/admin/use-cases/
|-- anchor-event/
|   |-- useAdminAnchorEventSelection.ts
|   |-- useAdminAnchorEventBasicEditor.ts
|   |-- useAdminAnchorEventLocationEditor.ts
|   |-- useAdminAnchorEventTimeEditor.ts
|   |-- useAdminAnchorEventTagsEditor.ts
|   `-- useAdminAnchorEventOtherEditor.ts
|-- pr/
|   |-- useAdminPRSelection.ts
|   |-- useAdminPREditor.ts
|   `-- useAdminPRMessagesEditor.ts
|-- support-resources/
|   |-- useAdminSupportResourceConfigEditor.ts
|   `-- useAdminSupportResourceExecution.ts
|-- pois/
|   |-- useAdminPoiSelection.ts
|   |-- useAdminPoiBasicEditor.ts
|   `-- useAdminPoiReview.ts
|-- feedback-questionnaires/
|   |-- useAdminFeedbackQuestionnaireSelection.ts
|   `-- useAdminFeedbackQuestionnaireTemplateEditor.ts
|-- session/
|   |-- useAdminAccess.ts
|   `-- useAdminSessionStore.ts
`-- shared/
    |-- useAdminEntitySelection.ts
    |-- useAdminConfirmAction.ts
    `-- useAdminDirtyState.ts
```

Query wrappers can migrate to a matching feature-folder shape when the import churn is justified:

```text
apps/frontend/src/domains/admin/queries/
|-- anchor-event/
|-- pr/
|-- support-resources/
|-- pois/
|-- feedback-questionnaires/
|-- session/
`-- shared/
    `-- admin-query-utils.ts
```

Migration guidance:

- keep route pages as assembly surfaces
- keep query modules thin around Hono RPC and TanStack Query
- place workflow state, draft state, validation, and save orchestration inside feature-owned Admin composables or business components according to the owner boundary
- place cross-feature helpers under `use-cases/shared`
- let business components own query and mutation hooks for independently meaningful API surfaces
- hide full-object mutation assembly behind narrower frontend use-cases before splitting backend endpoints

## AdminPageScaffold Contract

Requested layout:

- two visible columns at medium and desktop widths
- left operator column has one consistent width across Admin pages
- left operator column contains global Admin navigation and route-context modules shared across second-level views
- right workspace takes remaining width
- right workspace contains the page header and active second-level business section content
- route-context modules use viewport-bounded internal scroll through the left operator column

Candidate API:

```vue
<AdminPageScaffold>
  <template #navigation>
    <AdminNavigationPanel />
  </template>

  <template #header>
    <!-- title, subtitle, global route actions -->
  </template>

  <template #main>
    <!-- bento workspace -->
  </template>

  <template #rail>
    <!-- left-column route context: selected entity, filters, quick actions, pickers -->
  </template>
</AdminPageScaffold>
```

Candidate layout behavior:

- desktop:
  - outer shell owns full Admin viewport minus page safe areas
  - left operator column: `320px`
  - right workspace: `minmax(0, 1fr)`
  - left operator column stacks global navigation above route context
  - left operator column uses internal `overflow-y: auto` with viewport-bounded height
  - route context keeps the same column position across second-level views within the same top-level Admin area
- mobile / narrow:
  - left operator column stacks above the workspace
  - bento grid collapses to one column

## BentoLayout Contract

Responsibilities:

- provide consistent gap, card spans, and responsive collapse for Admin pages.
- expose simple span classes or props:
  - `span="full"`
  - `span="half"`
  - `span="third"`
  - `priority="primary"`

Initial use:

- list cards
- editor cards
- preview cards
- status/stat cards
- message/audit cards

Ownership:

- section orchestrators use BentoLayout directly
- business components render card content only
- card shell and shared actions are placed by the section orchestrator

## AdminContextRail Contract

Responsibilities:

- contextual module wrapper inside the left operator column
- route page decides content:
  - filters
  - selected entity summary
  - entity picker
  - quick actions
- stable bottom action slot if needed

Recommended context content by page:

- Anchor Event: anchor-event selector, selected anchor-event summary, quick status actions.
- PR: filters, PR list, selected PR summary.
- POI: POI selector, review status, publish/reject actions.
- Booking support: anchor-event selector, resource count, location scope summary.
- Booking execution: search, stats, filters.
- Feedback questionnaires: template selector and create action.

## AdminEntitySelectorPanel Contract

Responsibilities:

- common shell for route-local entity selection.
- support count, empty state, create sentinel, typed id conversion, and selected-state rendering.
- work with `useAdminEntitySelection`.

Candidate use:

- anchor events
- PRs
- POIs
- feedback questionnaire templates

## AdminDirtyActionBar Contract

Responsibilities:

- stable action zone for unsaved changes, validation errors, save state, and destructive actions.
- reduce route-specific save button placement drift.
- support slot-based actions rather than owning mutation semantics.

## AdminPanel Contract

Responsibilities:

- shared Admin section shell with governed spacing and border/background treatment.
- title, description, action, footer slots.
- avoid re-declaring `.panel`, `.card-title`, `.section-header`, and `.hint` in every Admin page.

Candidate API:

```vue
<AdminPanel>
  <template #title>...</template>
  <template #description>...</template>
  <template #actions>...</template>
  ...
</AdminPanel>
```

## Confirmation Needed Before Execute

Resolved decisions for the current execute slice:

1. The target navigation group model above is the Admin IA contract for this slice.
2. `AdminPageScaffold` uses two columns: left operator column for navigation plus route context, right workspace for active content.
3. The `#rail` slot is retained as a migration API for route context while its visual placement is the left operator column.
4. `AdminAnchorEventPage.vue` is migrated onto `AdminPageScaffold` to remove width drift against PR management.
5. Retained-surface cleanup remains governed by Slice 11:
   - `adminCommon.navPRMessages`
   - `adminBookingSupport.batchOverrides*`
   - `adminPRMessages.generatedPRCount`
