# PLAN — 首页活动区改造落地计划（去 Slide 模式）

## 1. 架构决策

- 首页主滚动容器从竖向全屏 `Swiper` 切换为原生文档流滚动。
- 活动内容允许拆成多个连续 section，不再强制全屏分页。
- 不新增 `Campaign` 命名，统一使用“活动单元 / 主位卡 / 次位卡 / 总入口条”。
- 动效必须可复用，优先沉淀到 `SCSS mixin + composable`。

## 2. 目标产物

- 一版原生滚动首页骨架（无全屏 slide 依赖）。
- 一套活动区结构：总入口条 + 主位卡 + 次位卡列表。
- 一套数据驱动文案模型（人数/时间/名额）。
- 一套复用动效能力（入场、按压、降级）。
- 一组可量化埋点（曝光、点击、转化）。

## 3. 分步实施

### Step A：拆除 Slide 架构（首页级）

- 在 `HomePage.vue` 移除 `Swiper/SwiperSlide`、`swiper/modules`、滚动同步逻辑。
- 保留原有 section 内容，但改为原生 section 连续布局。
- 清理以下逻辑：
  - `handleSwiperReady`
  - `setSwiperInteractionEnabled`
  - `syncSwiperInteractionWithPageScroll`
  - 初始 viewport reset 相关 timer/frame

完成标志：

- 首页可在移动端原生惯性滚动，且无滑动抢占冲突。

### Step B：活动区结构重建

- 新建活动区容器：
  - `apps/frontend/src/widgets/home/HomeEventSectionV2.vue`
- 拆分活动卡组件：
  - `HomeEventLeadCard.vue`
  - `HomeEventSubCardA.vue`
  - `HomeEventSubCardB.vue`
- 布局采用非对称节奏，避免 4 张同骨架堆叠。

完成标志：

- 用户在一次连续下拉中即可快速扫读所有活动单元。

### Step C：数据模型与文案模板

- 新增 `useHomeEventUnitData.ts`，聚合展示字段：
  - `joinedCount`
  - `activeSessionCount`
  - `remainingSlots`
  - `nearestStartAt`
  - `startsSoon`
- 输出：
  - `leadUnit`
  - `subUnits`
- i18n 新增转化文案模板：
  - 证明句、时效句、稀缺句、兜底句

完成标志：

- 每个活动单元至少展示“人数/时间/名额”中的两项。

### Step D：动效基础设施（可复用）

- 在 `apps/frontend/src/styles/_mixins.scss` 新增：
  - `pu-motion-enter($delay-ms, $distance)`
  - `pu-motion-pressable($scale)`
  - `pu-motion-ripple-base()`
  - `pu-motion-reduced()`
- 新增 composable：
  - `useInViewStagger.ts`
  - `usePressFeedback.ts`
  - `useReducedMotion.ts`
- 活动卡只消费抽象能力，不在单组件重复实现动画控制。

完成标志：

- 至少 2 个以上组件复用同一套 mixin/composable。

### Step E：交互与性能联调

- 接入按压反馈（`pointerdown/up/cancel`）。
- 入视口错落入场，不用 mounted 即播。
- `hover` 效果仅限 `hover: hover` 设备。
- `prefers-reduced-motion` 下自动降级。

完成标志：

- 触屏端点击反馈清晰，滚动连续且无明显掉帧。

### Step F：埋点与验收

- 新增事件：
  - `home_event_section_impression`
  - `home_event_card_impression`
  - `home_event_card_click`
  - `home_event_all_click`
- payload 至少包含：
  - `unitKey`
  - `isLead`
  - `remainingSlots`
  - `startsSoon`
- 构建验证：
  - `pnpm --filter @partner-up-dev/frontend build`

完成标志：

- 可回看曝光到点击转化漏斗。

## 4. 文件变更清单（建议）

新增：

- `apps/frontend/src/widgets/home/HomeEventSectionV2.vue`
- `apps/frontend/src/widgets/home/HomeEventLeadCard.vue`
- `apps/frontend/src/widgets/home/HomeEventSubCardA.vue`
- `apps/frontend/src/widgets/home/HomeEventSubCardB.vue`
- `apps/frontend/src/composables/useHomeEventUnitData.ts`
- `apps/frontend/src/composables/useInViewStagger.ts`
- `apps/frontend/src/composables/usePressFeedback.ts`
- `apps/frontend/src/composables/useReducedMotion.ts`

修改：

- `apps/frontend/src/pages/HomePage.vue`
- `apps/frontend/src/styles/_mixins.scss`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`
- `apps/frontend/src/shared/analytics/events.ts`

待移除：

- `apps/frontend/src/widgets/home/HomeEventSlideOne.vue`
- `apps/frontend/src/widgets/home/HomeEventSlideTwo.vue`
- `apps/frontend/src/composables/useHomeEventCampaignData.ts`

## 5. 工作量预估

1. 拆除首页 slide 架构：0.5d
2. 活动区重建：0.5d
3. 数据与文案模板：1d
4. 动效基础设施：1d
5. 联调与埋点验收：0.5d

总计：约 3.5d（单人）

## 6. 验收口径

- 首页不再依赖竖向全屏 `Swiper`。
- 活动区可连续扫读，无强制翻页阻力。
- 活动单元文案具备转化信号，不是纯介绍句。
- 动效能力可复用，且已在多个组件落地。
- 构建通过，关键路径跳转正常。
