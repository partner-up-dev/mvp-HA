# FRONTEND REFACTOR PLAN（MVP 阶段，可不兼容重构）

适用范围：`apps/frontend`  
关联 Cluster：`GAPC-01`、`GAPC-02`、`GAPC-03`、`GAPC-04`、`GAPC-05`

## 背景问题（当前）

1. 页面承载过重：
   - `PRPage.vue` 体积过大，状态、业务分支、UI 逻辑耦合严重。
2. 分享链路复杂且分散：
   - WeChat / 小红书逻辑跨页面、组件、composables 分散，回归成本高。
3. 领域状态缺少边界：
   - 业务状态、UI 临时状态、服务端状态混杂在页面层。
4. 查询与变更策略不统一：
   - query key、失效策略、错误处理模式在多个文件里重复。
5. 缺少“领域模块化”的目录结构：
   - 目前按技术类型拆分（components/queries/composables），不利于业务扩张。

## 重构目标

1. 建立“按领域组织”的前端架构，降低耦合并支持多条功能线并行开发。
2. 把页面简化为“组装层”，把业务规则下沉到 feature/use-case 层。
3. 统一数据访问与 mutation side effects，减少隐式刷新和状态漂移。
4. 为后续 GAP 集群落地提供稳定 UI 基础设施。

## 当前进度（2026-02-25）

已完成（第一批落地）：

1. 建立基础目录并启用新层：
   - `src/shared/api/query-keys.ts`
   - `src/features/pr-actions/usePRActions.ts`
   - `src/widgets/pr/PRHeroHeader.vue`
   - `src/widgets/pr/PRActionsPanel.vue`
   - `src/entities/pr/types.ts`
2. `PRPage` 已从“大页面”拆成容器 + widget + feature hook（行为保持不变）。
3. PR 相关 queries/mutations 已统一接入 query key 工厂（detail/creator/public config）。
4. 构建配置已允许 `widgets/features` 使用统一样式 mixin 注入。

已完成（第二批落地）：

1. `PRCreatePage` 已迁移为容器 + feature hook + widgets：
   - `features/pr-create/usePRCreateFlow.ts`
   - `widgets/pr-create/*`
2. `HomePage` 已迁移为容器 + widgets：
   - `widgets/home/*`
3. WeChat 参与动作鉴权已抽离到流程层：
   - `processes/wechat-auth/guards/requireWeChatActionAuth.ts`
4. `usePRActions` 已切换到流程层 guard，页面不再直接处理 OAuth 跳转判断。
5. `PRPage` 分享区域已下沉为 widget + feature share context：
   - `features/share/usePRShareContext.ts`
   - `widgets/pr/PRShareSection.vue`

已完成（第三批落地）：

1. 前端统一埋点 SDK 已落地（基础版）：
   - `shared/analytics/events.ts`
   - `shared/analytics/track.ts`
2. 分享链路进一步下沉到 feature hooks：
   - `features/share/as-link/useShareAsLink.ts`
   - `features/share/useShareCarousel.ts`
3. 链路级事件已覆盖创建/参与/确认/签到/分享切换与分享结果（成功/失败）。
4. URL 规范化能力已上收至 shared util：
   - `shared/url/normalizeUrl.ts`

未完成（下一批）：

1. 分享链路内部能力（微信/小红书生成、缓存、降级）仍有部分留在 `components/share/wechat|xhs`，尚未完全迁移到 `features/share/*`。
2. 埋点后端接收、落库与聚合任务尚未接入（当前为前端本地 debug 队列 + 控制台输出）。
3. 可测试性基建（FR-06）尚未启动。

## 目标架构（V2）

推荐目录（示意）：

- `src/app/*`：应用启动、provider、router 装配
- `src/processes/*`：跨页面流程（wechat-auth、share-flow）
- `src/pages/*`：页面容器，仅做布局与组合
- `src/widgets/*`：页面级复合块（pr-detail、pr-actions、pr-share-panel）
- `src/features/*`：单一业务能力（join-pr、confirm-slot、check-in、report-safety、apply-reimbursement）
- `src/entities/*`：核心实体模型与读模型（pr、slot、user、anchor-event）
- `src/shared/*`：UI 基础组件、工具函数、api 基座、埋点 SDK、样式 token

## 核心重构项

### FR-01 页面拆分

1. 将 `PRPage` 拆为：
   - `widgets/pr-header`
   - `widgets/pr-meta-card`
   - `widgets/pr-action-panel`
   - `widgets/pr-checkin-panel`
   - `widgets/pr-share-panel`
2. 页面只保留路由参数解析、SEO 信息装配、widget 编排。

### FR-02 Server State 统一

1. 建立统一 query key 工厂：
   - `shared/api/query-keys.ts`
2. 建立统一 mutation 约定：
   - 成功后更新策略（invalidate / optimistic / patch cache）
   - 错误映射（后端 error -> 可展示文案）
3. 把 API 调用从组件中抽离到 feature 层 use-case hooks。

### FR-03 Auth 与权限门控

1. 抽象 route/feature guard：
   - `processes/wechat-auth/guards/*`
2. 统一参与动作前置校验（join/exit/confirm/check-in/report/reimbursement）。
3. 页面不再直接写 OAuth 跳转逻辑。

### FR-04 分享系统模块化

1. 将分享能力重组为：
   - `features/share/as-link`
   - `features/share/wechat-card`
   - `features/share/xhs`
2. 统一输入模型（`ShareContext`），减少各组件重复拼接。
3. 统一缓存命中策略和失败降级策略。

### FR-05 设计系统与样式治理

1. 将业务样式从页面内联分离到 widget/feature 层。
2. 建立 token 分层：
   - `ref token`（色板/字体/间距）
   - `sys token`（语义色与尺寸）
   - `component token`（特定组件）
3. 禁止新增“大段 scoped 样式”进页面容器文件。

### FR-06 可测试性建设

1. 为 feature hook 建立单元测试。
2. 为关键 widget 建立交互测试：
   - PR 参与动作
   - check-in 二次确认
   - 分享卡片切换与回退
3. 引入最小 e2e smoke（创建 -> 加入 -> 确认 -> 签到）。

## 迁移策略（无兼容包袱）

### Phase 1：骨架搭建

1. 新目录结构落地（app/processes/pages/widgets/features/entities/shared）。
2. 搬迁 query key、api client、error mapper。
3. 新代码一律走新架构，旧路径只做稳定维护。

### Phase 2：核心页面迁移

1. 优先迁移 `PRPage`（最复杂）。
2. 迁移 `PRCreatePage` 与 `HomePage` 的交互流程。
3. 迁移分享链路到 `features/share/*`。

### Phase 3：收口与清理

1. 删除旧 `queries/composables` 中被替代的实现。
2. 清理重复样式与重复时间格式化逻辑。
3. 完成路径别名与 lint 规则固化。

## 与 Cluster 的衔接

1. `GAPC-01`：Anchor 批次与推荐 UI 由 `widgets/pr-supply-panel` 承载。
2. `GAPC-02`：提醒状态与实时人数由 `features/pr-live` 承载。
3. `GAPC-03`：经济规则与报销流程由 `features/economy/*` 承载。
4. `GAPC-04`：统一埋点 SDK 挂在 `shared/analytics`，页面只埋业务事件。
5. `GAPC-05`：举报入口与流程由 `features/safety-report` 承载。

## 验收标准

1. `PRPage` 文件体积显著下降，核心逻辑迁出页面容器。
2. 关键参与流程（join/confirm/check-in/share）都有独立 feature 模块。
3. query key 与 mutation 规则统一，避免“局部刷新不一致”。
4. 新增任一 GAP 功能时，不需要在页面里追加跨层逻辑。
5. 前端类型检查通过，关键流程测试可稳定执行。
