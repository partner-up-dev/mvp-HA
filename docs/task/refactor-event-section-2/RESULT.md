# RESULT — Step F（埋点与验收）

## 1. 交付结论

Step F 已完成，满足 `PLAN.md` 中“埋点与验收”要求：

- 新增并接入 4 个事件：
  - `home_event_section_impression`
  - `home_event_card_impression`
  - `home_event_card_click`
  - `home_event_all_click`
- 事件 payload 覆盖关键字段：
  - `unitKey`
  - `isLead`
  - `remainingSlots`
  - `startsSoon`
- 前后端事件白名单已同步。
- 前端构建与后端类型检查通过。

## 2. 埋点实现

### 2.1 事件定义（前端）

文件：

- `apps/frontend/src/shared/analytics/events.ts`

新增内容：

- `CanonicalAnalyticsEventName` 增加 4 个活动区 V2 事件。
- `CanonicalAnalyticsPayloadMap` 增加对应 payload 类型约束。

### 2.2 事件白名单（后端）

文件：

- `apps/backend/src/infra/analytics/event-taxonomy.ts`

新增内容：

- 将上述 4 个事件加入 `canonicalAnalyticsEventTypes` 与 `acceptedAnalyticsEventTypes`。

### 2.3 事件触发点（前端页面）

文件：

- `apps/frontend/src/widgets/home/HomeEventSectionV2.vue`
- `apps/frontend/src/widgets/home/HomeEventLeadCard.vue`
- `apps/frontend/src/widgets/home/HomeEventSubCardA.vue`
- `apps/frontend/src/widgets/home/HomeEventSubCardB.vue`

触发策略：

- `home_event_section_impression`：活动区首次进入视口时触发 1 次。
- `home_event_card_impression`：活动区进入视口后，按单元 key 去重触发曝光。
- `home_event_card_click`：点击主位卡/次位卡触发。
- `home_event_all_click`：点击“去活动广场看全部活动”触发。

兼容保留：

- 旧事件 `home_event_highlight_click`、`home_event_plaza_entry_click` 仍保留，避免分析看板断层。

## 3. 验证记录

执行时间：2026-03-04（Asia/Shanghai）

已执行命令：

1. `pnpm --filter @partner-up-dev/frontend build`
2. `pnpm --filter @partner-up-dev/backend typecheck`

结果：

- 两个命令均通过。
- 构建存在既有 vendor chunk 体积告警（>500kB），不影响本次 Step F 交付。

## 4. 验收口径映射

对照 `PLAN.md` Step F：

- `新增事件（4个）`：已完成
- `payload 包含 unitKey/isLead/remainingSlots/startsSoon`：已完成
- `构建验证`：已完成
- `可回看曝光 -> 点击转化漏斗`：已具备数据基础

## 5. 已知限制

- 当前卡片曝光基于“活动区进入视口后按单元去重触发”，并非逐卡独立视口检测。
- 旧活动组件与旧数据 composable 仍在仓库中（已不作为首页主路径渲染）。

## 6. 后续建议（可选）

1. 在 BI 看板单独建立 `landing_v2` 维度，区分旧首页事件。
2. 将卡片曝光升级为逐卡 `IntersectionObserver`，提升曝光口径精度。
3. 在后续清理阶段移除旧活动 slide 组件与旧 composable。
