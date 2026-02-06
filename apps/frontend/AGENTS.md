# AGENTS.md of PartnerUp MVP-HA (Frontend)

本项目是一个基于 Vue 3 的前端应用，使用 Hono RPC Client 与后端通信，并利用 TanStack Vue Query 进行服务端状态管理。

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (hc)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Coding Guidelines

### Type Safety

- RPC Infer Type: Do not manually define interfaces for API returns; let TypeScript infer from the Hono client.
- Request Params: If backend uses `zValidator`, mismatched param types will cause type errors — do not bypass with `as any`.

### API Calls

- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.

## Product Reference

- See `docs/product/overview.md` for H-A MVP definition and scope.

## Current State
>
> Last Updated: 2026-02-05 21:30

### Live Capabilities

- PartnerRequest 创建: 支持从既有自然语言句子创建协作 PartnerRequest（LLM 解析标题/类型/时间区间/地点/人数(min/current/max)/预算/偏好/到期时间等结构化字段）。
- PartnerRequest 时间: 创建时由前端提供 nowIso（UTC）作为解析参考，时间窗口允许日期或日期时间格式。
- PartnerRequest 状态: 已实现 `OPEN` / `ACTIVE` / `CLOSED` / `EXPIRED` 的前端展示与流转。
- 参与与流转: 支持加入/退出交互；达到最小人数自动转为 `ACTIVE`。
- 分享能力: 支持复制链接分享；微信内置 WebView 分享卡片；小红书文案与海报生成、下载并跳转 App。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时由后端懒触发过期状态。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- Mock 模式: 通过 `VITE_USE_MOCK=true` 使用本地 Mock RPC（仅开发用途）。

### Immediate Next Focus

- 目标：完善分享体验细节（小红书/微信的交互与样式一致性），并补齐过期状态的展示与提示文案。

## Read more

- Data Fetching: See `src/queries/AGENTS.md`.
- Components: See `src/components/AGENTS.md`.
