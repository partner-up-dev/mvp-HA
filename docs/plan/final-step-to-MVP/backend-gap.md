# Backend Gap Expansion (Snapshot: 2026-02-25)

## 1. 当前后端已具备能力
- PR 基础对象与 API：
  - 创建（自然语言/结构化）、查询、批量摘要、更新状态、更新内容、join/exit。
- 状态机基础：
  - `DRAFT/OPEN/ACTIVE/CLOSED/EXPIRED`。
  - 读时惰性过期（`expireIfNeeded`）。
- 分享服务：
  - 小红书海报 HTML、微信卡片缩略图 HTML、缓存读写。
- 微信能力：
  - JS-SDK 签名。
  - OAuth 登录会话接口（`/oauth/session/login/callback/logout`）。

## 2. 后端核心 GAP（按优先级）

### P0
- 领域状态机不匹配 PRD：
  - 无 `READY/FULL` 状态或等效字段。
  - 仍用 `ACTIVE` 代表“达到最小人数后状态变化”。
- 缺 Slot 级领域模型：
  - 数据库仅有 `partner_requests` 聚合计数（`partners=[min,current,max]`）。
  - 无参与者实体，无法表达 `JOINED/CONFIRMED/RELEASED/ATTENDED`。
- Anchor 规则无法执行：
  - 无 Anchor Event / Community PR 的结构化区分字段与实体。
  - `joinPR` 未绑定认证身份（无 openId 入参/上下文校验），无法做“Anchor 必须登录”。
- 可靠性机制缺失：
  - 无确认 API（confirm/cancel confirm）。
  - 无 T-1h 自动释放、T-30min 禁止加入的服务端硬约束。
  - 无提醒任务（T-24h/T-2h）调度与通道抽象。
- Batch 能力缺失：
  - 无 Anchor Event、Batch、跨场次推荐的数据结构与 API。

### P1
- 经济模型字段缺失：
  - 无 `payment_model`、`discount_rate`、`subsidy_cap`、`resource_booking_deadline` 等核心字段。
  - 无“平台订场责任”与规则说明所需的可配置数据。
- 报销闭环缺失：
  - 无 slot 级 `reimbursement_requested/reimbursement_status/reimbursement_amount`。
  - 无申请报销 API 与状态推进接口。
- Check-in/复参数据缺失：
  - 无到场记录接口（现场签到/事后自报）。
  - 无“是否愿再次参加”字段。
- 安全模块缺失：
  - 无举报数据表/API。
  - 无场地安全规则校验链路。
- 指标与运维抽象缺失：
  - 无 L1 指标事件化采集（PV、join 转化、min 达成、confirm、check-in、14 天复参）。
  - 无 PR 级 `operation_log` 结构化动作记录。

## 3. 现有 OAuth 能力的实际缺口
- 已有 OAuth 会话接口，但停留在“登录工具层”：
  - 未与 PR join/confirm/check-in 业务鉴权绑定。
  - 未形成可查询的用户参与历史（缺 user/slot 关联层）。
- 因此目前仍不能支撑 PRD 的“Anchor 强制登录 + 可靠性评分”目标。

## 4. 后端建议落点（实施顺序）
1. 先补领域模型：`anchor_events`、`pr_batches`、`pr_slots`（或等价设计）+ 迁移。
2. 改 join/exit 为身份感知接口，接入 OAuth 会话并执行 Anchor 门禁。
3. 新增 confirm/release/lock 时间窗规则与后台任务。
4. 新增 check-in 与事后反馈接口。
5. 加入 payment/reimbursement 字段与最小流程接口。
6. 加入 operation_log + 指标事件表（或事件总线）以支撑 L1 验证。
