# INFRA PLAN：跨 GAP Cluster 共享基础设施重构

适用 Cluster：`GAPC-01`、`GAPC-02`、`GAPC-03`、`GAPC-04`、`GAPC-05`  
原则：MVP 阶段不考虑向后兼容，可进行系统性重构与 schema 重整。

## 重构目标

1. 解决 `PartnerRequestService` 单体膨胀，建立清晰领域边界。
2. 让“业务动作 -> 事件 -> 任务/通知/统计”成为统一通道。
3. 为提醒、批次、报销、埋点、运营日志提供同一套执行基础。

## 目标架构（V2）

后端分层从：

- `Controller -> PartnerRequestService(大单体) -> Repository`

重构为：

- `Controller -> UseCase(按领域) -> Domain Service -> Repository`
- `Domain Event Bus (Outbox)`  
- `Job Runner (Scheduler + Worker)`  
- `Analytics Ingestor`

推荐目录（示意）：

- `apps/backend/src/domains/pr-core/*`
- `apps/backend/src/domains/anchor/*`
- `apps/backend/src/domains/reliability/*`
- `apps/backend/src/domains/economy/*`
- `apps/backend/src/domains/safety/*`
- `apps/backend/src/domains/analytics/*`
- `apps/backend/src/infra/events/*`
- `apps/backend/src/infra/jobs/*`

## 共享基础设施工作包

### INFRA-01：领域拆分与用例化

1. 把 `PartnerRequestService` 拆分为多个 UseCase：
   - `JoinPRUseCase`
   - `ConfirmSlotUseCase`
   - `CheckInUseCase`
   - `BatchingUseCase`
   - `ReimbursementUseCase`
2. 业务规则归位到领域模块，Controller 只做协议转换。

### INFRA-02：Outbox 事件骨架

1. 新增 `domain_events` 与 `outbox_events` 表。
2. 所有关键动作（join/confirm/check-in/full/reimbursement/report）写出事件。
3. Worker 消费 outbox，驱动提醒、统计、实时推送。

### INFRA-03：任务执行框架

1. 统一 `Job Runner`：
   - 周期任务（cron-like）
   - 延迟任务（T-24h/T-2h）
   - 重试与死信
2. 替代散落的 `setInterval` 逻辑，形成可观测任务系统。

### INFRA-04：统一埋点 SDK 与事件协议

1. 前端建立 `track(event, payload)` 统一入口。
2. 后端统一接收与落库协议。
3. 事件命名和字段强约束（类型化 schema）。

### INFRA-05：运营日志基础能力

1. 新增 `operation_logs` 通用写入接口。
2. 每个领域动作自动附带操作日志（谁、何时、做了什么、结果）。

## 数据与迁移策略

1. 采用“强迁移”策略：允许一次性重建部分表结构。
2. 对关键保留数据做导出快照（可选），迁移失败可回灌。
3. 先落 schema，再接入服务，再切换 API。

## 质量门禁

1. 每个领域模块必须有最小单元测试（规则层）。
2. 每个核心流程必须有集成测试（API 层）。
3. 事件处理必须可回放（至少在测试环境支持）。

## 与各 Cluster 的关系

1. `GAPC-01` 依赖：批次自动化 + 自动隐藏任务。
2. `GAPC-02` 依赖：提醒任务 + 实时事件流 + 评分计算作业。
3. `GAPC-03` 依赖：经济模型事件化 + operation log。
4. `GAPC-04` 依赖：统一埋点协议 + 事件聚合。
5. `GAPC-05` 依赖：举报事件与处理日志。

## 里程碑建议

1. M1（基础重构）：INFRA-01 + INFRA-02
2. M2（可运行任务）：INFRA-03
3. M3（可观测闭环）：INFRA-04 + INFRA-05

完成 M1 后再并行推进各 GAPC，可显著减少重复开发与返工。
