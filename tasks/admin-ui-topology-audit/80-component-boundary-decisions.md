# Component Boundary Decisions - Admin UI Decomposition

## Decision Summary

- Admin feature sections use a `Section Orchestrator` layer.
- Section orchestrators own `BentoLayout`, card allocation, card titles, shared actions, and section-level composition.
- Business components own their business content and, when the resource boundary matches, their query and mutation hooks.
- Business components render content only. Card, panel, tile, and layout containers stay in the orchestrator or shared layout layer.
- Anchor Event needs narrower use-cases or API surfaces so business components can mutate their own slices without assembling a full `AdminAnchorEventInput`.

## Layer Contract

### Page

Responsibilities:

- route shell and Admin navigation
- current route section resolution
- cross-section entity selection when the selected entity anchors the whole page
- high-level loading or auth guard state when shared by the page

The page should trend toward route assembly. Field-level editor state moves into the owning section or business component after decomposition.

### Section Orchestrator

Responsibilities:

- render `BentoLayout`
- allocate business components into Bento cards
- own card titles, descriptions, spans, and card action slots
- place shared action components, such as save, publish, reject, delete, refresh, or dirty-state actions
- pass minimal context to business components, such as `eventId`, `prId`, or `poiId`
- coordinate section-level empty, loading, and error states when multiple business components need a combined state

Naming:

- use `*Section.vue`
- examples:
  - `AnchorEventLocationsSection.vue`
  - `AnchorEventTimeSection.vue`
  - `AnchorEventOtherSection.vue`
  - `PRMessagesSection.vue`
  - `PoiReviewSection.vue`

### Business Component

Responsibilities:

- render business content only
- own query and mutation hooks when the business resource boundary matches the component boundary
- own local draft, validation, loading, empty, error, and dirty state for its business surface
- emit only stable coordination events when the orchestrator needs to react, such as `saved`, `changed`, or `selected`

Naming:

- use `*Content.vue` for display/list/status content
- use `*Editor.vue` for form editing content
- use `*Picker.vue` for selection content
- use `*Composer.vue` for message/input composition content

Avoid container semantics in business component names:

- `Panel`
- `Card`
- `Tile`
- `Section`
- `Layout`

## Query And Mutation Ownership

Business components should own queries and mutations when the API surface is independently meaningful:

- preference tag pool
- pending preference tag review
- landing rollout config
- PR message list and message composer
- POI review actions

When the backend currently exposes only a broad full-object mutation, introduce a narrower frontend use-case first. The use-case hides full-object assembly from business components and creates a stable boundary for later backend endpoint splits.

## Anchor Event Fine-Grained Use-Case/API Surface

Target frontend use-cases:

- `useUpdateAnchorEventBasic`
- `useUpdateAnchorEventLocations`
- `useUpdateAnchorEventTime`
- `useUpdateAnchorEventJoinGate`
- `useUpdateAnchorEventFeedbackQuestionnaire`
- `useUpdateAnchorEventLandingRollout`

Already independent or near-independent resources:

- `useAdminAnchorEventPreferenceTags`
- `useAdminAnchorEventLandingConfig`

Expected evolution:

- first wrap existing full update where needed
- then introduce narrower backend PATCH endpoints when justified
- keep business component contracts stable across that backend migration

## Anchor Event Section Decomposition

### 活动基本信息

Section orchestrator:

- `AnchorEventBasicSection.vue`

Business components:

- `AnchorEventCoreInfoEditor.vue`
  - owns title, type, description, and status editing
- `AnchorEventMediaEditor.vue`
  - owns cover image and beta group QR image input/upload controls
- `AnchorEventCapacityDefaultsEditor.vue`
  - owns default min/max partner bounds editing and validation display

Orchestrator cards:

- 活动基本信息
- 媒体资源
- 默认人数范围
- shared save/dirty action placement

### 活动场地

Section orchestrator:

- `AnchorEventLocationsSection.vue`

Business components:

- `AnchorEventLocationPoolEditor.vue`
  - owns location pool editing
  - can evolve into POI selector and validation
- `AnchorEventDefaultMeetingPointEditor.vue`
  - owns default meeting point description and image URL
- `AnchorEventLocationMeetingPointsEditor.vue`
  - owns per-location meeting point rows derived from the location pool

Orchestrator cards:

- 场地池
- 默认碰头地点
- 各场地碰头地点
- shared save/dirty action placement

### 活动时间

Section orchestrator:

- `AnchorEventTimeSection.vue`

Business components:

- `AnchorEventTimePoolStrategyEditor.vue`
  - owns duration, earliest lead, absolute rules, recurring rules, and validation display
- `AnchorEventParticipationPolicyEditor.vue`
  - owns event-level participation policy controls
- `AnchorEventTimeWindowsPreviewContent.vue`
  - owns generated time-window preview and empty state

Orchestrator cards:

- 时间窗口生成规则
- 活动级参与策略
- 已生成时间窗口
- shared save/dirty action placement

### 其它

Section orchestrator:

- `AnchorEventOtherSection.vue`

Business components:

- `AnchorEventJoinGateEditor.vue`
  - owns event-level join gate controls
- `AnchorEventFeedbackQuestionnairePicker.vue`
  - owns event-level feedback questionnaire template binding
- `AnchorEventLandingRolloutEditor.vue`
  - owns landing rollout query, mutation, validation, and config editing

Orchestrator cards:

- 活动级加入门槛
- 活动级反馈问卷
- 落地页模式分流
- shared save/dirty action placement for broad Anchor Event fields

## Directory Direction

Target shape:

```text
apps/frontend/src/domains/admin/ui/anchor-event/
|-- sections/
|   |-- AnchorEventBasicSection.vue
|   |-- AnchorEventLocationsSection.vue
|   |-- AnchorEventTimeSection.vue
|   |-- AnchorEventTagsSection.vue
|   `-- AnchorEventOtherSection.vue
`-- components/
    |-- AnchorEventLocationPoolEditor.vue
    |-- AnchorEventDefaultMeetingPointEditor.vue
    |-- AnchorEventLocationMeetingPointsEditor.vue
    |-- AnchorEventTimePoolStrategyEditor.vue
    |-- AnchorEventParticipationPolicyEditor.vue
    |-- AnchorEventTimeWindowsPreviewContent.vue
    |-- AnchorEventJoinGateEditor.vue
    |-- AnchorEventFeedbackQuestionnairePicker.vue
    `-- AnchorEventLandingRolloutEditor.vue
```
