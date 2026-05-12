# Slice 1 Implementation Notes - Admin Navigation Model

## Scope Completed

- Added `apps/frontend/src/domains/admin/ui/navigation/adminNavigationModel.ts`.
- Added `apps/frontend/src/domains/admin/ui/navigation/AdminNavigationPanel.vue`.
- Replaced protected Admin page usage of `AdminNavigationCard` with `AdminNavigationPanel`.
- Kept `AdminNavigationCard.vue` as a compatibility wrapper over `AdminNavigationPanel`.
- Added Admin navigation locale keys under `adminCommon`.
- Added missing `adminPRMessages.generatedPRCount` locale contract.
- Added retained schema/copy compatibility for `adminPRMessages.timeWindowsTitle`, `adminPRMessages.emptyTimeWindows`, `adminPRMessages.batchesTitle`, and `adminPRMessages.emptyBatches`.
- Updated `AdminNavigationPanel` to:
  - remove NavItem icons
  - render second-level entries through a one-open-group accordion
  - expand the active route group by default
  - bind second-level visual active state to the selected hash-level item
  - enforce max-height with internal scrolling
- Added `apps/frontend/src/domains/admin/use-cases/useAdminNavigationSection.ts`.
- Wired hash-level Admin content switching:
  - `AdminAnchorEventPage.vue`: basic, locations, time, tags, other
  - `AdminPRPage.vue`: PR basic and PR messages
  - `AdminPoisPage.vue`: POI basic and POI review

## Navigation Model Delivered

- 活动管理
  - 活动基本信息: `admin-anchor-events`, `#anchor-event-basic`
  - 活动场地: `admin-anchor-events`, `#anchor-event-locations`
  - 活动时间: `admin-anchor-events`, `#anchor-event-time`
  - 活动标签: `admin-anchor-events`, `#anchor-event-tags`
  - 其它: `admin-anchor-events`, `#anchor-event-other`
- PR 管理
  - PR 基本: `admin-pr`, `#pr-basic`
  - PR 留言: `admin-pr`, `#pr-messages`
- 支持资源
  - 资助配置: `admin-booking-support`
  - 资助执行: `admin-booking-execution`
- POIs 管理
  - POI 基本: `admin-pois`, `#poi-basic`
  - POI 审核: `admin-pois`, `#poi-review`
- 反馈问卷
  - 反馈问卷模板: `admin-feedback-questionnaires`

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - passed
- `.\node_modules\.bin\vite.CMD build --mode development` from `apps/frontend`
  - passed
- `pnpm --filter @partner-up-dev/frontend build`
  - blocked by local `vue-tsc` Node OOM / native crash before type errors were reported
- `.\node_modules\.bin\vue-tsc.CMD --noEmit --pretty false` from `apps/frontend`
  - blocked by local `vue-tsc` Node OOM / native crash
- `.\node_modules\.bin\tsc.CMD --noEmit --pretty false` from `apps/frontend`
  - blocked by an existing non-slice error: `src/domains/pr/use-cases/usePRCreateFlow.ts(57,20): error TS2349`
- Playwright browser check against `http://localhost:4001`
  - all protected Admin routes rendered `AdminNavigationPanel`
  - all routes showed the full top-level and second-level navigation model
  - active defaults:
    - `/admin/anchor-events` -> 活动基本信息
    - `/admin/pr` -> PR 基本
    - `/admin/booking-support` -> 资助配置
    - `/admin/booking-execution` -> 资助执行
    - `/admin/pois` -> POI 基本
    - `/admin/feedback-questionnaires` -> 反馈问卷模板
  - desktop screenshot: `scratch/admin-nav-desktop.png`
  - mobile screenshot: `scratch/admin-nav-mobile.png`
- Playwright accordion check against `http://localhost:4001/admin/pr`
  - default visible items: `PR 基本`, `PR 留言`
  - default expanded group: `PR 管理`
  - after opening `活动管理`, visible items: `活动基本信息`, `活动场地`, `活动时间`, `活动标签`, `其它`
  - after opening `活动管理`, expanded group: `活动管理`
  - accordion desktop screenshot: `scratch/admin-nav-accordion-desktop.png`
  - accordion mobile screenshot: `scratch/admin-nav-accordion-mobile.png`
- `agent-browser` active-state check against `http://localhost:4001/admin/pr`
  - `/admin/pr#pr-messages`: both PR links carry Vue Router active classes, only `PR 留言` carries `is-active` and primary border color
  - `/admin/pr#pr-basic`: both PR links carry Vue Router active classes, only `PR 基本` carries `is-active` and primary border color
- Playwright mocked-API content-switch check against `http://localhost:4001`
  - `/admin/pr#pr-basic` -> `admin-pr.section.basic`
  - `/admin/pr#pr-messages` -> `admin-pr.section.messages`
  - `/admin/pois#poi-basic` -> `admin-pois.section.basic`
  - `/admin/pois#poi-review` -> `admin-pois.section.review`
  - `/admin/anchor-events#anchor-event-time` -> `admin-anchor-event.section.time`
  - `/admin/anchor-events#anchor-event-other` -> `admin-anchor-event.section.other`

## Verification Caveat

The local seeded Admin credential returned `401 Invalid admin credentials`, so the browser check injected Admin localStorage and intercepted Admin API calls. This isolates navigation rendering and active-state verification from backend seed state.
