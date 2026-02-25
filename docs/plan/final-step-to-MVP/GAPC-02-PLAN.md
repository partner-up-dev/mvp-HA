# GAPC-02 PLAN：可靠性与触达（Reminder + Live Signal + Reliability Score）

对应 GAP：`G04`、`G14`、`G19`  
依赖：`INFRA-PLAN.md`（Job Runner、事件流、实时推送通道）

## 目标

1. 建立可执行的提醒机制（T-24h/T-2h）。
2. 提供跨端可感知的人数“近实时”变化能力。
3. 形成用户可靠性评分，用于后续 L2 策略。

## 方案范围

后端：

1. 新增提醒订阅与发送记录：
   - `notification_subscriptions`
   - `notification_jobs`
   - `notification_deliveries`
2. 新增可靠性聚合表：
   - `user_reliability_scores`
   - 指标：`join_to_confirm_ratio`、`confirm_to_attend_ratio`、`release_frequency`
3. 新增实时信号接口：
   - 优先 SSE：`/api/pr/:id/live`
   - 回退轮询：`/api/pr/:id/snapshot?since=...`

前端：

1. PR 页面接入 live 通道更新人数与状态。
2. 微信内展示“提醒订阅状态”与引导（仅可用环境展示）。
3. 保留降级路径：SSE 不可用时自动切到轮询。

## 分阶段实施

### Phase 1：提醒体系

1. 接入订阅状态存储与提醒任务入队。
2. 落地 T-24h/T-2h 规则任务。
3. 记录发送结果并可追踪失败重试。

### Phase 2：实时人数信号

1. PR 参与相关动作发布领域事件。
2. 通过 SSE 推送 `partnerCount/status` 变化。
3. 前端接入并保证断线重连。

### Phase 3：可靠性评分

1. 基于 slot 历史离线计算评分。
2. 暴露内部查询接口（仅运营可见，用户端不展示）。
3. 建立评分刷新作业（按日/按事件结束触发）。

## 验收标准

1. 目标用户在事件前可收到 T-24h/T-2h 提醒记录。
2. 两个终端同时打开同一 PR，人数变化可在秒级同步。
3. 每个活跃用户都能生成可靠性评分，且评分来源可追溯。

## 风险与决策

1. H5 推送能力受微信环境限制，必须设计“可发送但可降级”的通道策略。
2. 评分仅作内部策略信号，L1 不对用户展示，避免行为反噬。
