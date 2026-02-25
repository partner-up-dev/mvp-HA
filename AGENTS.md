# AGENTS.md of PartnerUp MVP-HA

This is a pnpm workspace (monorepo) with following packages:

- `apps/backend`
- `apps/frontend`

## Development Workflow

- [RECOMMENDED] Read following documents when you need
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
  - `docs/product/overview.md`
  - `docs/product/glossary.md`
  - `docs/product/features/*.md`
- You MUST ensure the documentations stay aligned with code. (documents in `docs/plan`, `docs/task` are temporarily, don't read or update them)
- This is a pnpm workspace, use `pnpm` to manage dependencies, run scripts.
- Git commit message follows `feat|fix|ref|docs|chore(module): subtitle \n description detailed in bullet potions`

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.

## Current State
>
> Last Updated: 2026-02-10T22:10Z+08:00

### Live Capabilities

- PartnerRequest 创建: 支持两条创建路径：`POST /api/pr/natural_language`（自然语言创建）与 `POST /api/pr`（结构化表单创建）。
- PartnerRequest 状态: 已实现 `DRAFT` / `OPEN` / `READY` / `FULL` / `ACTIVE` / `CLOSED` / `EXPIRED`；到期后会在读取时懒触发为 `EXPIRED`。
- PartnerRequest 草稿: 新增 `DRAFT` 状态，结构化创建可先保存草稿再发布。
- 参与与流转: 支持加入/退出；达到最小人数自动转为 `READY`，达到最大人数转为 `FULL`；`READY/FULL` 可手动或按时间窗口自动转为 `ACTIVE`。
- 分享能力: 支持系统分享（Web Share API，失败时回退复制链接）；支持微信聊天/朋友圈分享（WeChat WebView JS-SDK，PR 详情页可生成缩略图卡片，首页/创建页/联系作者页可直接配置分享卡片）；支持小红书文案与海报生成并下载/打开 App 分享。
- 微信登录能力: 已接入微信 OAuth 基础设施（`/api/wechat/oauth/session|login|callback|logout`），前端在页面进入时会自动尝试登录（仅微信 WebView 触发）。
- 前端国际化: 已接入 `vue-i18n`，当前仅启用 `zh-CN`；文案集中在 `apps/frontend/src/locales/zh-CN.jsonc`，并通过 `MessageSchema` 进行类型约束。
- 作者联系: 首页与页面底部提供“联系作者”入口；`/contact-author` 页面展示后端配置 `author_wechat_qr_code` 对应的微信二维码。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时懒触发过期状态，无全量后台定时任务。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- WeCom 时间语义: 企业微信回调仅提供 UTC timestamp；后端会按 `Asia/Shanghai` 推断 `nowWeekday` 供自然语言解析，可能与非该时区用户的本地星期认知不一致。
- 国际化语种: 当前仅支持 `zh-CN` 单语，尚未启用多语言切换。

### Immediate Next Focus

- 目标：完善分享体验细节（小红书/微信的交互与样式一致性），并补齐过期状态的展示与提示文案。
