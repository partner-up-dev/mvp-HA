# GAPC-03 PLAN：经济与报销闭环（Model A/C + Ops Log）

对应 GAP：`G08`、`G09`、`G10`、`G11`、`G18`、`G20`  
依赖：`INFRA-PLAN.md`（领域拆分、操作日志基础设施、事件持久化）

## 目标

1. 为 L1 经济模型建立完整数据结构（Model A/C）。
2. 打通“规则展示 -> 用户动作 -> 运营处理 -> 状态回写”闭环。
3. 所有经济相关动作可结构化审计，支持后续 L2 迁移。

## 方案范围

后端：

1. `partner_requests` 增加：
   - `paymentModel` (`A`/`C`/`B_RESERVED`)
   - `discountRate`
   - `subsidyCap`
   - `resourceBookingDeadline`
   - `cancellationPolicy`
2. `partners` 增加：
   - `paymentStatus`（可扩展）
   - `reimbursementRequested`
   - `reimbursementStatus`
   - `reimbursementAmount`
3. 新增 `operation_logs`（PR 级）：
   - booking created/updated
   - reimbursement requested/approved/rejected/paid
4. 新增报销接口：
   - `POST /api/pr/:id/reimbursement/request`
   - `GET /api/pr/:id/reimbursement/status`

前端：

1. PR 详情页新增“经济规则模块”：
   - 是否免费（Model C）
   - 人均限制与规则
   - booking deadline
   - 取消窗口说明
2. PR=CLOSED 时显示“申请报销”入口（Model A 且满足条件）。
3. 报销状态可视化（pending/approved/rejected/paid）。

## 分阶段实施

### Phase 1：数据层重构

1. 增补支付与报销字段。
2. 引入 `operation_logs` 表并统一日志写入接口。
3. 回填默认值，确保查询不会因空值崩溃。

### Phase 2：后端闭环

1. 实现报销申请与状态查询 API。
2. 与 WeCom 客服链路打通（跳转 + PR 链接复制）。
3. 把关键动作写入 `operation_logs`。

### Phase 3：前端呈现与交互

1. PR 页展示支付/补贴/取消策略说明。
2. 新增报销入口、状态卡片、失败反馈。
3. 与现有分享入口保持视觉一致性。

## 验收标准

1. Anchor PR 可明确区分 Model A/C，且规则完整可见。
2. 用户可在合规状态下发起报销申请，并看到状态变化。
3. 每一次经济动作都能在 `operation_logs` 中追踪。

## 风险与决策

1. MVP 阶段允许重构 schema，不保证历史数据自动兼容。
2. Model B 仅预留字段，不在本 Cluster 实装支付收单能力。
