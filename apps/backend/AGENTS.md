# AGENTS.md of PartnerUp MVP-HA (Backend)

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用经典分层（Layered Architecture），并在路由层适配了 Hono RPC 的类型推断机制。

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + @hono/zod-validator
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to dist/)

## Architecture

Controller -> Service -> Repository -> Entity

## File Structure

src/
├── entities/        # Drizzle schema definitions
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── controllers/     # Hono routes + validation (no business logic)
├── lib/             # DB engine + utilities
└── index.ts         # Entrypoint, mounts routes and exports AppType

## Development Guidelines

- Entity Layer (src/entities): see `src/entities/AGENTS.md`
- Repository Layer (src/repositories): see `src/repositories/AGENTS.md`
- Service Layer (src/services): see `src/services/AGENTS.md`
- Controller Layer (src/controllers): see `src/controllers/AGENTS.md`

## Best Practice Checklist

1. Strict Typing: Any `c.req.param()` / `c.req.json()` must be validated via `zValidator`.
2. No Logic in Controllers: Controllers only do HTTP/protocol conversion; logic lives in Services.
3. JSON Response: Always return via `c.json()` so RPC can infer types.
4. Error Handling: Use global `app.onError` to unify error response shapes.

## Product Reference

- See `docs/product/overview.md` for H-A MVP definition and scope.

## Current State
>
> Last Updated: 2026-02-10 22:10

### Live Capabilities

- PartnerRequest 创建: 已拆分为两条 API：`POST /api/pr/natural_language`（自然语言）与 `POST /api/pr`（结构化字段 + 状态）。
- PartnerRequest 时间: 解析时间窗口支持日期或日期时间（YYYY-MM-DD 或 ISO datetime），并基于 nowIso 与 nowWeekday（可用时）作为当前时间参考。
- LLM 解析提示词: 解析提示词已拆分到独立文件，并强调仅在用户明确提供时间时才输出时间分量。
- PartnerRequest 状态: 已实现 `DRAFT` / `OPEN` / `READY` / `FULL` / `ACTIVE` / `CLOSED` / `EXPIRED`；到期后会在读取时懒触发为 `EXPIRED`。
- 参与与流转: 支持加入/退出；达到最小人数自动转为 `READY`，达到最大人数自动转为 `FULL`；`READY/FULL` 可手动或按时间窗口自动转为 `ACTIVE`。
- 参与数据模型: 已迁移为 `minPartners` / `maxPartners` + `partners: partnerId[]`，并新增 `Partner`（含 `status`: `JOINED/CONFIRMED/RELEASED/ATTENDED`）用于 slot 级参与者标识。
- 用户最小模型: 新增 `users` 表（`openid` 唯一绑定，含 `nickname/sex/avatar` + `ACTIVE/DISABLED`）；新用户首次微信登录会拉取并保存资料，join/exit 时会校验微信会话并绑定到 `partner.userId`。
- 确认机制（5.2）: 新增 `/api/pr/:id/confirm`；`T-1h` 自动释放未确认 `JOINED` 槽位，`T-1h~T-30min` 加入即自动确认，`T-30min` 后禁止 join。
- 签到回流（5.3）: 新增 `/api/pr/:id/check-in`，记录 `didAttend` / `wouldJoinAgain`，到场时槽位置为 `ATTENDED`。
- 分享能力: 提供小红书文案/海报与微信缩略图生成能力，并支持缓存到后端。
- 公共配置能力: 提供 `/api/config/public/:key` 只读配置查询（当前支持 `author_wechat_qr_code`）。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时懒触发过期状态，无全量后台定时任务。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- WeCom 时间语义: 企业微信回调仅提供 UTC timestamp；后端按 `Asia/Shanghai` 推断 `nowWeekday` 供自然语言解析，可能与非该时区用户的本地星期认知不一致。

### Immediate Next Focus

- 目标：完善分享体验细节（小红书/微信的交互与样式一致性），并补齐过期状态的展示与提示文案。
