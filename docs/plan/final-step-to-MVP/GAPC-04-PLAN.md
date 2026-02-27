# GAPC-04 PLAN：观测与分析管线（Metrics + Split Pipeline + Taxonomy）

对应 GAP：`G13`、`G16`、`G21`  
依赖：`INFRA-PLAN.md`（统一埋点 SDK、事件存储、聚合任务）

## 目标

1. 建立 L1 决策所需指标体系，不再依赖人工估算。
2. 明确 Anchor 与 Community 两条分析管线，避免口径污染。
3. 产出可用于扩张决策的场景分类统计结果。

## 方案范围

事件标准化：

1. 定义统一事件字典：
   - `page_view`
   - `join_attempt` / `join_success`
   - `min_reached`
   - `slot_confirmed`
   - `check_in_submitted`
   - `share_clicked` / `share_converted`
   - `repeat_join_14d`
2. 每个事件包含：
   - `prId`
   - `prKind` (`ANCHOR`/`COMMUNITY`)
   - `type`
   - `actorId`（匿名或用户）
   - `occurredAt`

后端：

1. 新增 `analytics_events` 事件表。
2. 新增聚合任务与结果表：
   - `analytics_daily_anchor`
   - `analytics_daily_community`
   - `scenario_type_metrics`

前端：

1. 接入统一埋点 SDK（页面、参与、分享全链路）。
2. 埋点失败不阻塞业务流。
3. 本地开发可打开 debug 面板查看事件发送情况。

## 进度更新（2026-02-25）

已完成（Phase 1-部分）：

1. 前端已新增类型化事件字典与 SDK：
   - `apps/frontend/src/shared/analytics/events.ts`
   - `apps/frontend/src/shared/analytics/track.ts`
2. 已接入关键业务事件：
   - `pr_create_success`
   - `pr_join_success`
   - `pr_exit_success`
   - `pr_confirm_success`
   - `pr_checkin_submitted`
   - `share_method_switch`
   - `share_link_native_success`
   - `share_link_copy_success`
   - `share_link_failed`
3. 开发态可通过 `window.__PARTNER_UP_ANALYTICS_EVENTS__` 查看事件序列。
4. 埋点触发点已从页面/组件逐步收敛到 feature hooks，当前主要落位：
   - `features/pr-create/usePRCreateFlow.ts`
   - `features/pr-actions/usePRActions.ts`
   - `features/share/as-link/useShareAsLink.ts`
   - `features/share/useShareCarousel.ts`
   - `features/share/wechat/useShareToWechatChat.ts`
   - `features/share/xhs/useShareToXiaohongshu.ts`

未完成：

1. `page_view`、`share_converted`、`repeat_join_14d` 等事件仍未落地。
2. 后端 `analytics_events` 落库与按日聚合任务尚未启动。
3. Anchor/Community 分线统计仍缺少实体字段与任务实现。
4. 事件 payload 尚未统一补齐 `prKind/type/actorId` 等分线聚合关键字段。

## 分阶段实施

### Phase 1：事件字典与 SDK

1. 确认事件命名和字段规范。
2. 前后端接入同一事件协议。
3. 关键路径先覆盖：PV、join、confirm、check-in、share。

### Phase 2：聚合与分线

1. 建立 Anchor/Community 两套日聚合任务。
2. 输出 L1 关键指标：
   - join conversion
   - min-group success
   - confirmation rate
   - actual check-in rate
   - repeat join 14d

### Phase 3：场景分类分析

1. 按 `type` 聚合 fill rate 与 share-to-join。
2. 形成场景优先级榜单（内部使用）。
3. 支持后续模板策略调参。

## 验收标准

1. L1 六项核心指标可按日稳定产出。
2. Anchor 与 Community 指标可以独立查询，口径不混用。
3. 场景统计结果可驱动模板和投放决策。

## 风险与决策

1. 先保证事件正确性，再优化实时性和 BI 展示。
2. MVP 阶段可先用数据库聚合，不引入重型数仓组件。
