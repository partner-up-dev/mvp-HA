# PLAN — 首页 Landing 重构实施计划（MVP）

## 1. 前提与决策

- 当前为 MVP 阶段，**不考虑存量用户迁移/习惯成本**，只优化新访客首访体验。
- 首页定位从“创建操作面板”改为“Landing + 探索入口”。
- 首页不嵌入复杂表单与长段落，保留跳转能力到既有页面（`/pr/new`、`/events`、`/contact-author`）。
- 新增能力以现有 API 为前提（复用 `useAnchorEvents`），不新增后端业务接口。

## 2. 实施目标（DoD）

- 首页首屏不出现自然语言输入表单和结构化表单内容。
- 首页包含并可点击：
  - Event Highlights Section
  - Event Plaza Entry（跳转 `/events`）
- 页面滚动到中段时出现“收藏网站/复制链接”轻提示（带节流，不高频打扰）。
- 首页视觉层级清晰，移动端优先（360~430 宽度）无拥挤感。
- 埋点可用，能评估“首页探索与转化”效果。

## 3. 交付范围

## 3.1 In Scope

- 重排首页信息架构与视觉层级。
- 新增首页探索组件（Highlights、Plaza Entry、Bookmark Nudge）。
- 调整首页 CTA 路径（探索优先，创建次级）。
- 增补首页相关埋点与 i18n 文案。
- 更新受影响产品文档。

## 3.2 Out of Scope

- PR 详情页与创建页业务逻辑改造。
- 新增后台推荐算法或新接口。
- A/B 平台建设（先用埋点+人工对比观察）。

## 4. 分阶段实施

### Phase 0 — 基线与拆线（0.5d）

目标：先让改造可控、可回滚。

- 建立首页现状基线（截图 + 关键路径记录）。
- 明确当前首页组件保留/下沉策略：
  - `HomeNLCreatePanel` 从首页主流程移除。
  - `CreatedPRList` 不再占据首页主视图。
- 定义首页组件新骨架（只改布局，不接复杂逻辑）。

文件：

- `apps/frontend/src/pages/HomePage.vue`
- `apps/frontend/src/widgets/home/HomeEntryPanel.vue`（可删除或降级为次级区）

### Phase 1 — Landing 骨架与首屏（1d）

目标：5 秒认知，首屏只保留核心信息和主次 CTA。

- 重构 `HomeHero`：
  - 大标题 + 一句副标题 + 主 CTA + 次 CTA。
  - 删除“展开复杂输入”的默认导向。
- 新增“快速认知区”（3 个短句卡片）。
- 统一 section 间距、字号层级、移动端留白。

建议新增组件：

- `apps/frontend/src/widgets/home/HomeValueProps.vue`
- `apps/frontend/src/widgets/home/HomePrimaryActions.vue`

主要修改：

- `apps/frontend/src/widgets/home/HomeHero.vue`
- `apps/frontend/src/pages/HomePage.vue`

### Phase 2 — Event Highlights + Plaza Entry（1d）

目标：给“不知道找什么搭子”的用户现成选择。

- 新增 `HomeEventHighlights`：
  - 复用 `useAnchorEvents`。
  - 展示 3~6 张活动卡（封面/标题/1 行描述）。
  - 点击跳 `/events/:eventId`。
  - 包含 loading / error / empty 状态。
- 新增 `HomeEventPlazaEntry`：
  - 大卡片 + 明确按钮，跳 `/events`。
- 保持视觉克制，不增加复杂筛选交互。

建议新增组件：

- `apps/frontend/src/widgets/home/HomeEventHighlights.vue`
- `apps/frontend/src/widgets/home/HomeEventPlazaEntry.vue`

### Phase 3 — 收藏推荐中段提示（0.5d）

目标：降低“看过就走”。

- 新增 `HomeBookmarkNudge`（轻提示条/底部浮层）：
  - 触发阈值：滚动深度约 50%（允许 45%~60%）。
  - 节流策略：`localStorage` 每日最多展示 1 次。
  - 两个动作：`收藏网站`、`复制首页链接`。
- 环境分支文案：
  - 微信 WebView：展示收藏引导文案。
  - 普通浏览器：展示书签建议 + 复制兜底。

建议新增：

- `apps/frontend/src/widgets/home/HomeBookmarkNudge.vue`
- `apps/frontend/src/composables/useHomeBookmarkNudge.ts`

### Phase 4 — 埋点、类型与文案收口（0.5d）

目标：让“是否降流失”可被量化。

- 前端新增事件类型并埋点：
  - `home_hero_primary_click`
  - `home_event_highlight_click`
  - `home_event_plaza_entry_click`
  - `home_bookmark_nudge_shown`
  - `home_bookmark_action_click`
- 后端放行新事件类型（analytics ingest 白名单）。
- 更新 i18n 文案与 `MessageSchema` 类型定义。

文件：

- `apps/frontend/src/shared/analytics/events.ts`
- `apps/frontend/src/shared/analytics/track.ts`（如需 payload 扩展）
- `apps/backend/src/infra/analytics/event-taxonomy.ts`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

### Phase 5 — 文档同步与验收（0.5d）

目标：文档与代码一致。

- 同步产品文档：
  - 首页从“创建入口集合”更新为“Landing + 探索入口”。
  - 联系作者入口描述调整为次级动作位。
- 产出结果文档（实施后补）。

文件：

- `docs/product/features/find-partner.md`
- `docs/product/features/contact-author.md`
- `docs/task/refactor-home/RESULT.md`（实施完成后）

## 5. 代码改动清单（预计）

## 5.1 新增文件

- `apps/frontend/src/widgets/home/HomeValueProps.vue`
- `apps/frontend/src/widgets/home/HomePrimaryActions.vue`
- `apps/frontend/src/widgets/home/HomeEventHighlights.vue`
- `apps/frontend/src/widgets/home/HomeEventPlazaEntry.vue`
- `apps/frontend/src/widgets/home/HomeBookmarkNudge.vue`
- `apps/frontend/src/composables/useHomeBookmarkNudge.ts`

## 5.2 修改文件

- `apps/frontend/src/pages/HomePage.vue`
- `apps/frontend/src/widgets/home/HomeHero.vue`
- `apps/frontend/src/widgets/home/HomeEntryPanel.vue`（保留则瘦身，不保留则删除引用）
- `apps/frontend/src/widgets/home/HomeContactEntry.vue`（改为次级动作）
- `apps/frontend/src/shared/analytics/events.ts`
- `apps/backend/src/infra/analytics/event-taxonomy.ts`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`
- `docs/product/features/find-partner.md`
- `docs/product/features/contact-author.md`

## 6. 验证计划

## 6.1 自动化验证

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm build`

## 6.2 手动验证（移动端优先）

- 首屏可在 5 秒内看懂“产品是什么 + 下一步做什么”。
- 首页无复杂表单，主线是“探索活动”。
- Highlights 卡片可正确跳转到活动详情。
- Plaza Entry 可跳转 `/events`。
- 滚动到中段触发收藏提示；当天二次访问不重复打扰。
- 微信与非微信环境下提示文案符合预期。
- 页面在 360/390/430 宽度下无布局断裂。

## 7. 发布与回滚

## 7.1 发布顺序

1. 前端改造 + 后端 analytics taxonomy 一并发布。
2. 上线后 24~72 小时观察首页行为数据。

## 7.2 回滚策略

- 若出现关键交互异常：回滚前端首页到旧版组件组合。
- 若仅埋点事件被拒：先热修后端 `acceptedAnalyticsEventTypes`，不回滚 UI。

## 8. 风险与缓解（MVP版）

- 风险：首页转化到创建页短期波动。
  - 缓解：保留 Hero 次 CTA“我想发起一个搭子”，持续观察转化漏斗。
- 风险：活动数据少时 Highlights 吸引力不足。
  - 缓解：空态下展示明确引导（去活动广场/直接发起）。
- 风险：收藏能力跨环境不一致。
  - 缓解：统一提供“复制首页链接”兜底动作。

## 9. 执行拆分建议（PR 级别）

1. PR-1：首页骨架与首屏（Phase 0-1）
2. PR-2：Highlights + Plaza Entry（Phase 2）
3. PR-3：Bookmark Nudge + 埋点（Phase 3-4）
4. PR-4：文案、文档、验收收尾（Phase 5）

