# PLAN — 首页 Event Section 重构实施计划（MVP 冷启动）

## 1. 输入与目标

基于 `PROPOSAL.md` 最新版本（含第 4 部分文案更新），本计划目标是：

- 将首页 event section 收敛到 2 个版面以内。
- 合并 Gateway 与 Conversion，保留轻量入口条。
- 落地 4 个“半版面 Campaign”（羽毛球/慢跑/茶话会/口语练习）。
- 支持第 4 部分新增动态文案位：
  - `<地点轮播，打字机效果>`
  - `<最近一场的开始时间>`
- 不使用 `EventCard` 模板化批量生成首页 Campaign。

## 2. 关键实现决策

### 2.1 结构决策

- 保持 `HomePage.vue` 现有纵向 Swiper 架构。
- 将当前单个 event slide 改为两个 slide：
  - Slide 1：Gateway + 羽毛球半版面 + 慢跑半版面
  - Slide 2：茶话会半版面 + 口语练习半版面

### 2.2 数据决策

- 复用现有 `GET /api/events` 作为活动列表主数据。
- 对应第 4 部分动态文案位，按需读取 `GET /api/events/:eventId`：
  - 地点轮播：`locationPool[].label`
  - 最近开始时间：`batches[].timeWindow[0]` 最早有效值
- 不新增后端接口。

### 2.3 映射决策（冷启动容错）

- 在前端定义固定 campaign 映射配置（4 个活动）。
- 通过 `title/type` 关键词匹配 anchor event（优先中文关键词）。
- 匹配失败时使用静态兜底文案与兜底 CTA（跳 `/events`）。

## 3. 实施分阶段

### Phase 0：骨架与目录准备（0.5d）

任务：

- 新增 event section 组件目录与文件骨架。
- 在 `HomePage.vue` 接入两个新 event slide 容器，先渲染静态占位。
- 保留旧组件引用直到新结构可用后再移除。

涉及文件（新增/修改）：

- `apps/frontend/src/pages/HomePage.vue`（改）
- `apps/frontend/src/widgets/home/HomeEventSlideOne.vue`（新）
- `apps/frontend/src/widgets/home/HomeEventSlideTwo.vue`（新）

### Phase 1：数据层与文案槽位（1d）

任务：

- 新增 `campaign` 配置与匹配逻辑。
- 基于 `useAnchorEvents` 生成四个 campaign 的 event 绑定结果。
- 为可见 campaign 拉取详情并计算：
  - `rotatingLocations: string[]`
  - `nextStartAtLabel: string | null`
- 提供统一兜底字段（无地点/无时间/无 eventId）。

涉及文件（建议）：

- `apps/frontend/src/widgets/home/event-campaigns.ts`（新）
- `apps/frontend/src/composables/useHomeEventCampaignData.ts`（新）
- `apps/frontend/src/composables/useCampaignRotatingText.ts`（新，可复用现有打字机思路）

### Phase 2：四个半版面 Campaign 组件（1.5d）

任务：

- 落地 4 个独立组件（模板独立，不做 `v-for + 通用卡片`）。
- 每个组件接入对应动态文案槽位。
- CTA 跳转策略：
  - 有匹配 eventId：跳 `/events/:eventId`
  - 无匹配或不可用：跳 `/events`

涉及文件（新增）：

- `apps/frontend/src/widgets/home/HomeEventBadmintonHalf.vue`
- `apps/frontend/src/widgets/home/HomeEventRunningHalf.vue`
- `apps/frontend/src/widgets/home/HomeEventTeaTalkHalf.vue`
- `apps/frontend/src/widgets/home/HomeEventSpeakingHalf.vue`

### Phase 3：Gateway 条与交互细节（0.5d）

任务：

- 在 Slide 1 顶部实现轻量 Gateway 条。
- 样式满足：`body-large + arrow`。
- 实现“一次性渐变闪烁”动效（首次进入触发一次，后续不重复）。

涉及文件：

- `apps/frontend/src/widgets/home/HomeEventSlideOne.vue`（改）
- `apps/frontend/src/widgets/home/home-event-section.scss`（新，若需要拆样式）

### Phase 4：文案、i18n、可访问性（0.5d）

任务：

- 将第 4 部分文案完全落入 i18n key，避免硬编码。
- 增加动态插值 key（地点轮播、最近开始时间）。
- 完成 `prefers-reduced-motion` 降级。

涉及文件：

- `apps/frontend/src/locales/zh-CN.jsonc`（改）
- `apps/frontend/src/locales/schema.ts`（改）
- 各 campaign 组件样式（改）

### Phase 5：替换旧实现与验收（0.5d）

任务：

- 移除首页对 `HomeEventHighlights` / `HomeEventPlazaEntry` 的依赖。
- 清理不再使用的样式与 import。
- 完成构建与手动验收。

涉及文件：

- `apps/frontend/src/pages/HomePage.vue`（改）
- `apps/frontend/src/widgets/home/HomeEventHighlights.vue`（保留供 Event Plaza 使用场景评估，首页不再引用）
- `apps/frontend/src/widgets/home/HomeEventPlazaEntry.vue`（同上）

## 4. 第 4 部分文案对应的技术落地表

- 羽毛球 CTA：`就在<地点轮播，打字机效果>`
  - 数据：`locationPool.label[]`
  - 交互：地点名逐字切换，支持 reduced motion 退化为静态首项。

- 慢跑标题：`<地点轮播>，慢慢跑`
  - 数据：`locationPool.label[]`
  - 交互：慢速轮播，切换间隔长于打字机 CTA。

- 慢跑 CTA：`就<最近一场的开始时间>`
  - 数据：最早有效 `batches[].timeWindow[0]`
  - 格式：短日期 + 时间（例：`周三 19:30`），无值时回退 `看慢跑场次`。

- 茶话会 CTA：`就在<地点轮播>`
  - 数据：`locationPool.label[]`
  - 交互：与羽毛球保持一致的轮播机制，避免两套实现。

## 5. 风险与缓解

- 风险：活动命名与 campaign 关键词不一致，导致映射失败。
  - 缓解：配置多关键词匹配 + 无匹配兜底跳转 `/events`。

- 风险：首页请求增加（列表 + 多个详情）。
  - 缓解：详情查询按可见区域懒加载，利用 Vue Query 缓存。

- 风险：打字机动画影响可读性或性能。
  - 缓解：控制频率；在 `prefers-reduced-motion` 和低性能场景降级为静态文本。

## 6. 验收清单（MVP）

- event section 版面总数 <= 2。
- Slide 1 存在轻量 Gateway 条，且仅闪烁一次。
- 四个活动均为独立半版面组件，不复用 `EventCard` 模板渲染主体。
- 第 4 部分文案占位全部可用，且具备无数据兜底。
- 移动端 360/390/430 宽度下无明显布局断裂。
- `prefers-reduced-motion` 下无关键内容丢失。
- 构建通过：`pnpm --filter @partner-up-dev/frontend build`。

## 7. 建议提交拆分

1. `ref(frontend): home event section skeleton and two-slide layout`
2. `feat(frontend): campaign data mapping and dynamic copy slots`
3. `feat(frontend): four half-campaign components with gateway strip`
4. `chore(frontend): i18n, motion fallback, cleanup and build pass`
