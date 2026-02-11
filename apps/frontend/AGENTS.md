# AGENTS.md of PartnerUp MVP-HA Frontend

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (hc)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Coding Guidelines

- RPC Infer Type: Do not manually define interfaces for API returns; let TypeScript infer from the Hono client.
- Request Params: If backend uses `zValidator`, mismatched param types will cause type errors — do not bypass with `as any`.
- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.

## Documents

Read following documents when needed and keep them current:

- Data Fetching: See `src/queries/AGENTS.md`.
- Components: See `src/components/AGENTS.md`.

## Product Reference

- See `docs/product/overview.md` for H-A MVP definition and scope.

## Current State
>
> Last Updated: 2026-02-10 22:10

### Live Capabilities

- PartnerRequest 创建: 首页支持自然语言创建（展开 `NLPRForm`）；新增 `/pr/new` 结构化创建页，支持“保存(DRAFT)”与“创建(OPEN)”。
- PartnerRequest 时间: 自然语言创建时由前端提供 nowIso（UTC）作为解析参考；结构化创建与编辑复用 `PartnerRequestForm`。
- PartnerRequest 状态: 已实现 `DRAFT` / `OPEN` / `ACTIVE` / `CLOSED` / `EXPIRED` 的前端展示与流转。
- 参与与流转: 支持加入/退出交互；达到最小人数自动转为 `ACTIVE`。
- 分享能力: 支持复制链接分享；微信内置 WebView 分享卡片；小红书文案与海报生成、下载并跳转 App。
- 国际化能力: 已接入 `vue-i18n`，当前仅启用 `zh-CN`；文案位于 `src/locales/zh-CN.jsonc`，使用 `MessageSchema` 提供类型支持。
- 作者联系能力: 首页与各页面页脚支持“联系作者”入口；`/contact-author` 页面可居中展示作者微信二维码（来自后端公共配置）。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时由后端懒触发过期状态。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- 国际化语种: 当前仅支持 `zh-CN` 单语，未提供语言切换 UI。

### Immediate Next Focus

- 目标：完善分享体验细节（小红书/微信的交互与样式一致性），并补齐过期状态的展示与提示文案。
