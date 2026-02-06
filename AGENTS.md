# AGENTS.md of PartnerUp MVP-HA

This is a pnpm workspace (monorepo) with following packages:

- `apps/backend`
- `apps/frontend`

## Development Workflow

- [RECOMMENDED] Read following documents when you need
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
- You MUST update the documents as you make changes to the code.
- Use `pnpm` to manage dependencies, run scripts. (Use `pnpm --filter` to run package-specific operations.)

## Documentation System

- Product docs live in `docs/product/` with `overview.md`, `features/*.md`, and `glossary.md`.
- Feature docs must only include: user stories, flow, acceptance criteria, and involved surfaces.
- Repo-level docs live in each package `AGENTS.md` and should stay aligned with code.
- Key decisions live in `docs/h_a_mvp_key_decisions.md`.
- Code is the source of truth; docs are for communication.

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.

## Current State
>
> Last Updated: 2026-02-05 17:53

### Live Capabilities

- PartnerRequest 创建: 支持从既有自然语言句子创建协作 PartnerRequest（LLM 解析标题/类型/时间区间/地点/人数(min/current/max)/预算/偏好/到期时间等结构化字段）。
- PartnerRequest 状态: 已实现 `OPEN` / `ACTIVE` / `CLOSED` / `EXPIRED`；到期后会在读取时懒触发为 `EXPIRED`。
- 参与与流转: 支持加入/退出；达到最小人数自动转为 `ACTIVE`；受最大人数限制。
- 分享能力: 支持复制链接分享；支持微信聊天分享（WeChat WebView JS-SDK，生成含缩略图的分享卡片）；支持小红书文案与海报生成并下载/打开 App 分享。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时懒触发过期状态，无全量后台定时任务。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- Mock 模式: 前端可通过 `VITE_USE_MOCK=true` 使用本地 Mock RPC（仅开发用途）。

### Immediate Next Focus

- 目标：完善分享体验细节（小红书/微信的交互与样式一致性），并补齐过期状态的展示与提示文案。
