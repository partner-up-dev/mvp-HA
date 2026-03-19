# GAPC-03 PLAN：经济与报销闭环（Model A/C + Ops Log）

对应 GAP：`G08`、`G09`、`G10`、`G11`、`G18`、`G20`  
依赖：`INFRA-PLAN.md`（领域拆分、操作日志基础设施、事件持久化）、`GAPC-01-PLAN.md`（Anchor Event/Batch/PR 三层供给）

## 目标

1. 为 L1 经济模型建立完整数据结构（Model A/C）。
2. 打通“规则展示 -> 用户动作 -> 运营处理 -> 状态回写”闭环。
3. 所有经济相关动作可结构化审计，支持后续 L2 迁移。
4. 明确 `booking_deadline` 对状态流转与 release 规则的影响，消除执行歧义。
5. 明确 Anchor Event 自动扩容场景下的经济字段继承规则，保证单一事实源（SSoT）。

## 关键决策（补齐 PRD 语义）

1. **booking deadline 到达后，PR 进入 `LOCKED_TO_START`（新增状态）**：阻断继续 `join`；已确认槽位不可再主动 `release/exit`。
2. **经济字段支持 Event+Batch 两级配置**：`anchor_events` 提供默认 `discountRate/subsidyCap`，`anchor_event_batches` 可覆盖。
3. **PR 只保存“已解析策略快照”**：按 `batch override > event default` 解析后落库，用于结算与审计。
4. **`subsidyCap` 语义为“单人补贴封顶”**：MVP 不引入 Batch 共享补贴池（不做 batch-level budget sharing）。
5. **Model A 报销强依赖到场确认**：仅 `ATTENDED` 槽位可申请；H5 不提供 `receipt_upload`，账单材料通过 WeCom 客服链路提交。
6. **L1 仅支持 Model A/C**：`paymentModel` 不预留 Model B 枚举。

## 方案范围

后端：

1. `anchor_events` 增加（经济策略默认值）：
   - `paymentModel` (`A`/`C`)
   - `discountRateDefault`
   - `subsidyCapDefault`
   - `resourceBookingDeadlineRule`（规则/模板）
   - `cancellationPolicy`
2. `anchor_event_batches` 增加（经济策略覆盖值）：
   - `discountRateOverride`（nullable）
   - `subsidyCapOverride`（nullable）
   - `economicPolicyVersion`
3. `partner_requests` 增加（运行态 + 快照）：
   - `status` 扩展：`LOCKED_TO_START`
   - `resourceBookingDeadlineAt`（按 Event 规则解析后的具体时间点）
   - `paymentModelApplied`
   - `discountRateApplied`
   - `subsidyCapApplied`
   - `cancellationPolicyApplied`
   - `economicPolicyScopeApplied`（`EVENT_DEFAULT`/`BATCH_OVERRIDE`）
   - `economicPolicyVersionApplied`
4. `partners` 增加：
   - `paymentStatus`（可扩展）
   - `reimbursementRequested`
   - `reimbursementStatus`
   - `reimbursementAmount`
5. 新增/扩展 `operation_logs`（PR 级）：
   - booking policy applied
   - unconfirmed slots auto-released by `booking_deadline`/`T-1h`
   - state changed to/from `LOCKED_TO_START`
   - reimbursement requested/approved/rejected/paid
6. 新增报销接口：
   - `POST /api/pr/:id/reimbursement/request`
   - `GET /api/pr/:id/reimbursement/status`

前端：

1. PR 详情页仅保留“经济与预订规则”入口卡片（摘要 + 跳转）。
2. 新增独立页面（例如 `/pr/:id/economy`）集中展示：
   - 是否免费（Model C）
   - 人均限制与补贴规则
   - booking deadline（具体时间）
   - 取消窗口说明
3. PR=`LOCKED_TO_START` 时展示“已锁定待开始，暂不可加入”状态文案。
4. PR 进入结束态（`EXPIRED`/`CLOSED`）时显示“申请报销”入口（Model A 且满足条件）。
5. 报销状态可视化（pending/approved/rejected/paid）。
6. 不提供前端 `receipt_upload` 表单，仅提供 WeCom 客服跳转/引导与 PR 链接复制。

## 关键流程补充

### A. Booking Deadline 与状态机

1. 触发条件：
   - `now >= resourceBookingDeadlineAt`
   - 且 PR 当前状态属于 `OPEN` / `READY` / `FULL`
2. 状态流转：
   - `OPEN|READY|FULL -> LOCKED_TO_START`
   - `LOCKED_TO_START -> ACTIVE -> EXPIRED/CLOSED`（其余规则保持原有）
3. 行为约束（`LOCKED_TO_START`）：
   - 禁止 `join`
   - 对未确认槽位执行与 `T-1h` 一致的自动释放（`JOINED -> RELEASED`）
   - 保留 `T-1h 未确认自动释放`；两者复用同一释放逻辑并做幂等
   - 对已确认槽位（`CONFIRMED/ATTENDED`）禁止主动 `exit/release`
4. 可观测性：
   - 每次进入/退出 `LOCKED_TO_START`、以及自动释放触发（来源=`booking_deadline`/`T-1h`）均记录 `operation_logs`。

### B. Anchor 自动扩容/跨 Batch 的经济继承

1. 解析优先级：
   - `discountRate/subsidyCap` 按 `batch override > event default` 解析
   - 解析结果写入 PR 的 `*Applied` 快照字段
2. 同 Batch 自动新建 PR（Option B）：
   - 读取该 Batch 的覆盖值（若有）与 Event 默认值，生成快照
3. 推荐并创建新 Batch + PR（Option C）：
   - 新建 Batch 时可配置覆盖值；未配置则回退 Event 默认值
   - 创建 PR 时落快照，保证同 PR 生命周期内结算规则稳定
4. 策略变更边界：
   - Event 默认值更新后，影响“未覆盖的 Batch”下未来新建 PR
   - Batch 覆盖值更新后，仅影响该 Batch 下未来新建 PR
   - 已存在 PR 继续使用其创建时快照（保证结算稳定）
5. `subsidyCap` 范围：
   - 默认按“单参与者上限”解释，不跨 PR/Batch 共享额度
   - 若未来需要 batch 共享预算，L2 再引入独立 budget 聚合模型

## 分阶段实施

### Phase 1：数据层重构

1. 为 `anchor_events` 增加经济默认字段（A/C only）。
2. 为 `anchor_event_batches` 增加经济覆盖字段与版本号。
3. 为 `partner_requests` 增加 `LOCKED_TO_START` 与 `*Applied` 快照字段。
4. 为 `partners` 增补报销字段。
5. 引入/扩展 `operation_logs` 表并统一日志写入接口。
6. 回填默认值，确保查询不会因空值崩溃。

### Phase 2：后端闭环

1. 实现 `booking_deadline` 驱动的 `LOCKED_TO_START` 流转与读写守卫。
2. 实现 booking_deadline 与 `T-1h` 共用的未确认槽位自动释放逻辑（幂等）。
3. 实现 join/exit/release 在锁定态下的禁止规则。
4. 实现 Event+Batch 两级策略解析器与 Option B/Option C 的 PR 快照继承逻辑。
5. 实现报销申请与状态查询 API（仅 `ATTENDED` 可申请，其他状态拒绝）。
6. 与 WeCom 客服链路打通（跳转 + PR 链接复制）。
7. 把关键动作写入 `operation_logs`。

### Phase 3：前端呈现与交互

1. PR 页新增“经济与预订规则”入口卡片（摘要态）。
2. 新增独立规则页展示支付/补贴/booking deadline/取消策略说明。
3. 新增 `LOCKED_TO_START` 状态文案与行为禁用反馈。
4. 新增报销入口、状态卡片、失败反馈。
5. 与现有分享入口保持视觉一致性。

## 验收标准

1. Anchor PR 可明确区分 Model A/C，且规则完整可见。
2. 到达 `resourceBookingDeadlineAt` 后，PR 必定进入 `LOCKED_TO_START`，并禁止 join；同时未确认槽位按与 `T-1h` 相同逻辑自动释放。
3. `T-1h` 自动释放逻辑保持生效，与 booking deadline 触发逻辑幂等一致。
4. Option B/Option C 新建 PR 均按 `batch override > event default` 解析并写入快照字段。
5. Event/Batch 策略变更不回溯污染历史 PR 的结算规则。
6. 仅 `ATTENDED` 用户可在合规状态下发起报销申请，并看到状态变化。
7. PR 详情页保留入口卡片，完整规则展示迁移到独立页面。
8. 每一次经济动作都能在 `operation_logs` 中追踪。

## 风险与决策

1. MVP 阶段允许重构 schema，不保证历史数据自动兼容。
2. `LOCKED_TO_START` 为新增状态，需要同步更新状态机文档、前端枚举与埋点字典。
3. 本 Cluster 明确不包含 Model B 字段预留与收单能力。
