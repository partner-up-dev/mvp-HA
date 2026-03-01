# AGENTS.md of PartnerUp MVP-HA (Backend)

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用领域驱动分层（Domain-oriented Layered Architecture），控制器只做协议转换，业务逻辑拆分为独立 use-case 函数，领域规则归位到 domain service。跨领域关注点（事件、任务、日志、埋点）由 infra 层统一提供。

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + @hono/zod-validator
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to dist/)

## Architecture

```
Controller  ──►  UseCase (per domain)  ──►  Domain Service  ──►  Repository  ──►  Entity
                        │
                        ├──►  Event Bus  ──►  Outbox Writer  ──►  Outbox Worker
                        ├──►  Operation Log Service
                        └──►  Analytics Ingestor
```

Background tasks are managed by a DB-backed JobRunner (delayed jobs + due-job claiming). In scale-to-0 serverless, execution is driven by internal tick endpoints and request-tail best-effort kicks instead of in-process intervals.

## File Structure

```
src/
├── entities/             # Drizzle schema definitions (partner-request, partner, user, config, domain-event, outbox-event, operation-log, job)
├── repositories/         # Data access layer (pure CRUD)
├── services/             # Legacy service facades (thin wrappers delegating to domains/)
├── domains/
│   └── pr-core/          # PartnerRequest lifecycle domain
│       ├── use-cases/    # One function per business action (create, join, exit, confirm, check-in, etc.)
│       ├── services/     # Domain services (time-window, status-rules, slot-management, user-resolver, pr-view)
│       └── temporal-refresh.ts  # Shared temporal status refresh logic
├── infra/
│   ├── events/           # Domain Event Bus + Outbox writer/worker (INFRA-02)
│   ├── jobs/             # Unified JobRunner (INFRA-03)
│   ├── analytics/        # Analytics event ingestion (INFRA-04)
│   └── operation-log/    # Operation log service (INFRA-05)
├── controllers/          # Hono routes + validation (no business logic)
├── lib/                  # DB engine + utilities
└── index.ts              # Entrypoint, mounts routes, request-tail maintenance, exports AppType
```

## Development Guidelines

- Entity Layer (src/entities): see `src/entities/AGENTS.md`
- Repository Layer (src/repositories): see `src/repositories/AGENTS.md`
- Domain Use-Cases (src/domains/): **new code should import use-cases directly** instead of going through service facades.
- Controller Layer (src/controllers): see `src/controllers/AGENTS.md`
- Infra Layer (src/infra/): event bus, job runner, analytics ingest, operation log — cross-cutting concerns.
- Better not use interval, background jobs, the backend is being deployed in a scale-to-0 serverless.

## Best Practice Checklist

1. Strict Typing: Any `c.req.param()` / `c.req.json()` must be validated via `zValidator`.
2. No Logic in Controllers: Controllers only do HTTP/protocol conversion; logic lives in domain use-cases.
3. JSON Response: Always return via `c.json()` so RPC can infer types.
4. Error Handling: Use global `app.onError` to unify error response shapes.
5. Domain Events: Key business actions must emit domain events via `eventBus.publish()` + `writeToOutbox()`.
6. Operation Logs: Use `operationLogService.log()` (fire-and-forget) for audit trail on domain actions.
7. Background Jobs: Persist delayed jobs through `jobRunner.scheduleOnce()` and drive execution via tick endpoints / request-tail kick — never use raw `setInterval`.

## Current State
>
> Last Updated: 2026-02-27 19:00

### Live Capabilities

- PartnerRequest 创建: 已拆分为两条 API：`POST /api/pr/natural_language`（自然语言）与 `POST /api/pr`（结构化字段 + 状态）。
- PartnerRequest 时间: 解析时间窗口支持日期或日期时间（YYYY-MM-DD 或 ISO datetime），并基于 nowIso 与 nowWeekday（可用时）作为当前时间参考。
- LLM 解析提示词: 解析提示词已拆分到独立文件，并强调仅在用户明确提供时间时才输出时间分量。
- PartnerRequest 状态: 已实现 `DRAFT` / `OPEN` / `READY` / `FULL` / `ACTIVE` / `CLOSED` / `EXPIRED`；到期后会在读取时懒触发为 `EXPIRED`。
- 参与与流转: 支持加入/退出；达到最小人数自动转为 `READY`，达到最大人数自动转为 `FULL`；`READY/FULL` 可手动或按时间窗口自动转为 `ACTIVE`。
- 参与数据模型: 已迁移为 `minPartners` / `maxPartners` + `partners: partnerId[]`，并新增 `Partner`（含 `status`: `JOINED/CONFIRMED/RELEASED/ATTENDED`）用于 slot 级参与者标识。
- 用户最小模型: 新增 `users` 表（`openid` 唯一绑定，含 `nickname/sex/avatar` + `ACTIVE/DISABLED`）；新用户首次微信登录会拉取并保存资料，join/exit 时会校验微信会话并绑定到 `partner.userId`。
- 确认机制（5.2）: 新增 `/api/pr/:id/confirm`；`T-1h` 自动释放未确认 `JOINED` 槽位，`T-1h~T-30min` 加入即自动确认，`T-30min` 后禁止 join。
- 公众号提醒（5.2）: 新增 `GET/POST /api/wechat/reminders/subscription`；开启后为已加入槽位调度 `T-24h/T-2h` 任务（优先服务号订阅通知 `message/subscribe/bizsend`，模板消息通道保留兜底），退出/释放/关闭提醒会删除待执行任务，发送结果落库 `notification_deliveries`。
- 签到回流（5.3）: 新增 `/api/pr/:id/check-in`，记录 `didAttend` / `wouldJoinAgain`，到场时槽位置为 `ATTENDED`。
- 分享能力: 提供小红书文案/海报与微信缩略图生成能力，并支持缓存到后端。
- 公共配置能力: 提供 `/api/config/public/:key` 只读配置查询（当前支持 `author_wechat_qr_code`）。
- 领域拆分与用例化 (INFRA-01): `PartnerRequestService` 已拆分为独立 use-case 函数（`createPRFromNaturalLanguage`、`createPRFromStructured`、`joinPR`、`exitPR`、`confirmSlot`、`checkIn`、`updatePRStatus`、`updatePRContent` 等），业务规则归位到 `domains/pr-core/services/`（time-window、status-rules、slot-management）。原 `PartnerRequestService` 保留为薄 facade 以兼容存量调用方。
- Outbox 事件骨架: 新增 `domain_events` 与 `outbox_events`（含 `operation_logs`）表；所有关键动作（create/join/exit/confirm/check-in/status-change/content-update）写出领域事件到 outbox。Outbox 消费支持请求尾批处理，并采用行锁 claim 防重复领取。
- 任务执行框架 : `JobRunner` 已升级为 DB-backed 执行器（支持延迟/一次性任务、tolerance 窗口、租约与重试）；提供 `/internal/jobs/tick` 供外部定时触发，并支持请求尾 best-effort 补偿执行。
- 统一埋点 SDK 后端接入: `POST /api/analytics/events` 批量接收埋点并落库到 `domain_events`，支持旧事件名迁移映射（join/confirm/check-in/share）与衍生指标事件丢弃（`share_converted`/`repeat_join_14d`）。
- Analytics 聚合任务: 新增 `analytics.aggregate.daily` JobRunner 任务，按 `UTC+8`（`Asia/Shanghai`）生成 `analytics_daily_anchor`、`analytics_daily_community`、`scenario_type_metrics`。
- 运营日志基础能力: 新增 `operation_logs` 表与 `operationLogService.log()` 通用写入接口；每个领域动作自动附带操作日志。

### Known Limitations & Mocks

- EXPIRED 触发方式: 目前主要依赖请求路径中的懒触发刷新（读取/加入/退出/确认/签到等用例会先 refresh），无独立全量后台扫描。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- WeCom 时间语义: 企业微信回调仅提供 UTC timestamp；后端按 `Asia/Shanghai` 推断 `nowWeekday` 供自然语言解析。
- Outbox Worker: 当前为请求尾批处理（best-effort）；仍未接入外部消息队列与独立 worker。
- Analytics: 已实现落库 + 日聚合结果表；尚未提供 BI 仪表盘与管理端查询界面。
- Operation Log: 仅写入，尚未提供管理端查询 UI。

### Immediate Next Focus

- 在各 GAPC 中接入事件消费者（提醒、评分、经济模型、举报处理）。
- 完善 outbox handler 注册机制和监控告警。
