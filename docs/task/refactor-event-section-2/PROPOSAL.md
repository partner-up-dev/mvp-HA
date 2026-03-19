# 首页活动区重构提案（V3：去 Slide 模式）

## 1. 决策更新

- 首页不再使用竖向全屏 `Swiper` 作为主滚动容器。
- 页面改为原生纵向流式滚动，保留移动端惯性与连续浏览体验。
- 多个 section 是允许的，不再追求“强行压缩为少数全屏页”。

## 2. 目标

- 把活动区从“活动说明”改为“立即加入某场活动”的转化入口。
- 降低滚动冲突、翻页负担和浏览阻力，提升扫读效率。
- 保留 4 个活动主题（羽毛球/慢跑/茶话会/口语），但避免模板化重复呈现。

## 3. 现状问题

### 3.1 滚动与结构问题

- 首页当前依赖全屏 slide 结构，用户被迫一页一页翻。
- 竖向全屏滑动与原生页面滚动并存，存在触摸手势竞争与卡顿风险。
- 内容扩展受限，新增信息只能继续叠 slide，心智负担会线性上升。

### 3.2 文案问题

- 当前主结构仍是 `kicker + title + description + cta` 的说明书逻辑。
- 缺少“社会证明 + 时效 + 稀缺”组合，无法回答“为什么现在进入”。

### 3.3 动效问题

- 交互反馈过度依赖 `:hover`，移动端价值接近零。
- 仅有一次性闪烁提醒，缺少入视口层次动效与触控反馈。

### 3.4 布局问题

- 四个活动组件骨架几乎一致，视觉节奏单一。
- 占位图形偏“静态展示”，弱化真实活动正在发生的信任感。

## 4. 重构原则

1. `Native Flow First`：优先原生连续滚动，不做全屏翻页劫持。
2. `Now > Intro`：优先展示“现在可加入什么”，再介绍活动类型。
3. `Mobile Feedback`：所有关键点击在触屏端必须可感知。
4. `Data-backed Copy`：文案由实时数据驱动，减少口号式描述。
5. `Reusable Motion`：动效抽象为 SCSS + composable，不在组件内复制粘贴。
6. `Reduced-motion Safe`：完整支持 `prefers-reduced-motion`。

## 5. 信息架构（原生流式）

- 活动区可以拆为多个连续 section（而非全屏 slide）：
  - `Live Strip`：全局热度与实时信号
  - `Lead Unit`：主位活动卡（最接近转化）
  - `Sub Units`：3 个次位活动卡（交错布局）
  - `All Events Entry`：进入活动广场
- 允许在后续增加“专题区/筛选区/推荐区”，不破坏滚动模型。

## 6. 文案系统（转化四段式）

每个活动单元固定四段信息：

1. `Proof`：已有多少人参与
2. `Urgency`：最近开场时间/倒计时
3. `Scarcity`：剩余名额/可加入场次
4. `Action`：立即动作（如“立即占位”）

无数据兜底：

- `该主题场次更新中，去活动广场看同城新局`
- CTA 统一跳转 `/events`

## 7. 动效与交互方案（复用优先）

### 7.1 入场

- 使用 `IntersectionObserver` 触发错落入场，不在 mounted 时统一播放。
- 过渡只用 `transform/opacity`，避免重排型属性动画。

### 7.2 触控反馈

- 卡片和 CTA 提供 `pointerdown -> scale down`、`pointerup/cancel -> rebound`。
- 轻量 ripple 作为补充，时长不超过 280ms。

### 7.3 设备分层

- `hover: hover` 设备保留 hover 效果。
- 触屏设备以按压反馈为主。
- `prefers-reduced-motion` 下自动降级为无动画版本。

## 8. 数据与埋点

### 8.1 数据字段

前端展示模型新增：

- `joinedCount`
- `activeSessionCount`
- `remainingSlots`
- `nearestStartAt`
- `startsSoon`

字段优先由 `GET /api/events/:eventId` 的 `batches[].prs[]` 聚合。

### 8.2 埋点

- `home_event_section_impression`
- `home_event_card_impression`
- `home_event_card_click`
- `home_event_all_click`
- `home_event_card_press_feedback`

关键 payload：

- `unitKey`
- `isLead`
- `remainingSlots`
- `startsSoon`

## 9. 实施阶段

### Phase 1：拆除全屏 slide 架构

- 从 `HomePage.vue` 移除竖向全屏 `Swiper` 依赖与相关滚动同步逻辑。
- 改为原生 section 流式布局。

### Phase 2：活动区结构重建

- 新建 `HomeEventSectionV2.vue` 与主位/次位卡组件。
- 用真实布局替代“双屏对半”结构。

### Phase 3：数据驱动文案

- 新增活动单元数据 composable，聚合人数/时间/名额字段。
- 文案切换到转化四段式模板。

### Phase 4：动效基础设施与联调

- 新增 SCSS 动效 mixin 与通用 composable。
- 接入入场、按压反馈、降级分支。

### Phase 5：埋点与验收

- 接入曝光与点击埋点，验证漏斗闭环。
- 完成移动端滚动与交互回归。

## 10. 验收标准（DoD）

- 首页主滚动不再依赖竖向全屏 `Swiper`。
- 活动区支持多 section 连续浏览，不需要强制翻页。
- 活动单元文案包含社会证明、时效、稀缺中的至少两项。
- 触屏端点击反馈可感知，且不与滚动冲突。
- 动效能力来自可复用 SCSS/composable，非单组件硬编码。
- 可追踪完整漏斗：曝光 -> 点击 -> 进入活动详情/活动广场。
