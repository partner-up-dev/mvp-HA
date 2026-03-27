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
- UnoCSS Icon Preset configured, use icons by `class="i-mdi-icon-name"`.
- Styling governance: use direct `sys` tokens first (Material3 style); add `dcs` only for real governed outputs; add recipes only for governed logic or stable shared treatments.
- Make use of SCSS features.
- Page layout reuse: Prefer `src/shared/ui/layout/PageScaffold.vue`, `PageScaffoldFlow.vue`, `PageScaffoldCentered.vue`, and `DesktopPageScaffold.vue` for route pages; do not duplicate root safe-area container styles in page files.
- Feature composition boundary: extract reusable feature UI + business logic into dedicated feature components (for example, `APRNotificationSubscriptions`) instead of leaving logic in page files.
- Container vs feature split: keep container components (for example, `WeChatNotificationSubscriptionsCard`) presentational-only; they should provide layout/shell and should not own feature side effects.
- Usage-site assembly: pages (for example, `AnchorPRPage`) should assemble container + feature components, and only own page context such as visibility, section placement, and page-level error aggregation.
- Reuse-first rule: if a second page needs the same feature behavior (for example, `MePage`), reuse the extracted feature component rather than duplicating handlers in page scope.

## Documents

Read following documents when needed and keep them current:

- `docs/20-product-tdd/*.md`
- `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant
- Architecture: `src/ARCHITECTURE.md`
- Vue Component Guideline: See `src/AGENTS.components.md`.
- Styling governance: `src/styles/TOKEN-GOVERNANCE.md`
- Styling agent rules: `src/styles/AGENTS.md`
- Data Fetching: See `src/queries/AGENTS.md`.

Useful commands:

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

## File Structure

Use `src/ARCHITECTURE.md` as the source of truth.

The active structure is:

```text
src/
├── app/                    # Application wiring
├── domains/                # Domain-owned code by business area
├── shared/                 # Cross-domain infrastructure and UI primitives
├── pages/                  # Route entrypoints only
├── stores/                 # Legacy compatibility seams only
├── lib/                    # Legacy compatibility seams only
├── locales/
├── router/                 # Legacy compatibility seams only
├── styles/
└── ...
```

Rules:

- New domain-owned modules belong under `src/domains/<domain>/*`.
- New cross-domain primitives or infrastructure belong under `src/shared/*`.
- App bootstrap, providers, and router wiring belong under `src/app/*`.
- Do not add new files under legacy buckets such as top-level `queries`, `features`, `entities`, or `widgets` unless explicitly maintaining a temporary compatibility seam.

## Current State
>
> Last Updated: 2026-03-26 18:30

### Live Capabilities

- PartnerRequest 创建: 首页已重构为 Landing（Hero + 活动亮点 + 次级动作），活动区恢复为 `EventHighlights + EventPlazaEntry`（横向活动卡片 + 活动广场入口）；Hero 价值点 item1（“从一句话开始”）支持点击展开首页内联 NL 创建面板（两行布局：NL 输入 + PIN/发送）；`/cpr/new` 融合自然语言与结构化创建，结构化模式支持“保存(DRAFT)”与“创建(OPEN)”。
- PartnerRequest 时间: 自然语言创建时由前端提供 nowIso（UTC）与 nowWeekday（用户本地周几）作为解析参考；结构化创建与编辑复用 `PartnerRequestForm`。
- PartnerRequest 状态: 已实现 `DRAFT` / `OPEN` / `READY` / `FULL` / `LOCKED_TO_START` / `ACTIVE` / `CLOSED` / `EXPIRED` 的前端展示与流转。
- 活动锚点创建: `/events/:eventId` 支持在 batch/location 上下文中创建受控 Anchor PR；该创建路径是活动页内动作，不是独立通用创建页。
- 参与与流转: 支持加入/退出交互；达到最小人数自动转为 `READY`，达到最大人数转为 `FULL`；`READY/FULL` 可手动或按时间窗口自动转为 `ACTIVE`。
- 参与数据模型: 已适配 `minPartners` / `maxPartners` + `partners: partnerId[]`，加入/退出按当前设备 `partnerId` 进行 slot 级交互；后端会将该 `partnerId` 绑定到微信 `openid` 对应用户。
- 微信登录约束: Community PR 加入会复用本地账户 / PIN 会话并在首次加入时自动创建本地账户；Anchor PR 的加入/退出/确认参与/签到反馈前会检查微信会话，未登录则重定向 OAuth 登录；请求携带 `credentials: include` 以发送会话 cookie。
- 确认与签到交互: 详情页新增“确认参与”“我已到场/我未到场”按钮，分别调用 `/confirm` 与 `/check-in`。
- 公众号提醒交互: 当前仅 Anchor PR 详情页提供“公众号提醒”开关；微信环境且已登录时可开启/关闭（`GET/POST /api/wechat/reminders/subscription`），非微信或未登录时展示降级提示。
- Admin 预订执行控制台: 新增 `/admin/booking-execution`，桌面端可查看已触发预订的 Anchor PR 待处理列表、提交平台预订结果、释放无效预订联系人，并对执行审计与手动释放记录做客户端搜索。
- 分享能力: 支持系统分享（Web Share API，失败时回退复制链接）；微信内置 WebView 分享卡片（PR 详情页支持缩略图卡片，首页/创建页/联系客服页可直接分享至聊天与朋友圈）；小红书文案与海报生成、下载并跳转 App；公开分享链接支持 `spm` 参数归因并在当前浏览器会话内延续到后续埋点。
- 国际化能力: 已接入 `vue-i18n`，当前仅启用 `zh-CN`；文案位于 `src/locales/zh-CN.jsonc`，使用 `MessageSchema` 提供类型支持。
- 通知订阅交互: `BOOKING_RESULT` 不再只是前端次数展示项；当后台提交预订结果后，Anchor PR 活跃参与者会实际收到对应结果通知。
- 客服联系能力: 首页与各页面页脚保留“需要帮助”入口（跳转 `/contact-support`）；`/contact-support` 页面会根据微信内外环境自动跳转企业微信客服链接（优先读取后端公共配置，加载中/失败/缺失时回退默认链接），并提供前往 `/contact-author` 与 `/about` 的入口。
- 关于页能力: `/about` 页面展示产品名称、代码仓库地址、前端 commit hash（构建注入）与后端 commit hash（通过 `/api/meta/build` 拉取），并可弹出公众号二维码。

### Known Limitations & Mocks

- EXPIRED 触发方式: 仅在读取 PR 时由后端懒触发过期状态。
- 小红书发布: 无官方直发接口，仅生成文案/海报并引导用户手动保存与发布。
- 微信分享环境: 仅在微信内置 WebView 且 JS-SDK 正常加载时生效。
- 国际化语种: 当前仅支持 `zh-CN` 单语，未提供语言切换 UI。

### Immediate Next Focus

- 目标：在 Phase 6 中继续收缩遗留顶层分类，优先处理仍留在 `composables` 和 `widgets/home` 的 ownership seam，并在稳定结构上继续推进 token-system migration。
