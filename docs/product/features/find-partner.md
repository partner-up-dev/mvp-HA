# 功能：创建搭子请求 PartnerRequest

## 用户故事

- 作为用户，我希望进入首页后先快速理解产品，并从“活动亮点/活动广场”中获得灵感，再决定是否发起搭子。
- 作为用户，我希望进入创建页后可在“自然语言”与“结构化表单”间切换，并按需补充细节。
- 作为创建者，我希望编辑时和创建时使用同一套结构化表单，减少学习成本。

## 流程

- 首页为 Landing 结构，优先提供探索入口：
  - Hero 主按钮进入 `/events`（活动广场）。
  - Hero 价值点 item1「从一句话开始」点击后展开内联自然语言创建表单（两行：NL 输入 + PIN/发送）。
  - Event Highlights 卡片进入 `/events/:eventId`（活动详情）。
  - Event Plaza Entry 进入 `/events`。
  - 次级动作区提供“去创建页”与“联系作者”入口（跳转到 `/contact-support`）。
- 首页不默认展开自然语言输入表单与结构化表单，仅在用户点击 item1 时按需展开轻量 NL 表单。
- 创建页（`/pr/new`）融合两种创建方式：
  - 自然语言模式提交到 `/api/pr/natural_language`。
  - 结构化模式使用统一表单组件。
- 结构化模式页脚提供：
  - “保存” -> 创建 `DRAFT` 状态请求。
  - “创建” -> 创建 `OPEN` 状态请求。
- 创建成功时系统会按 `min/max` 预创建 `partners` 槽位；若创建者已有微信登录态，会占用其中一个槽位。
- 详情页加入/退出时需走微信登录态校验：未登录会跳转 `/api/wechat/oauth/login`。
- 加入成功时对应 `Partner.status` 置为 `JOINED`；在 `T-1h~T-30min` 窗口加入时会立即置为 `CONFIRMED`。
- `T-1h` 时刻会自动释放仍为 `JOINED` 的槽位（变为 `RELEASED` 并从 PR 当前参与列表移除）。
- `T-30min` 后禁止加入（event locked）。
- 详情页提供“确认参与”动作，调用 `/api/pr/:id/confirm` 使槽位进入 `CONFIRMED`（若尚未确认）。
- 详情页提供可选签到反馈（我已到场 / 我未到场），调用 `/api/pr/:id/check-in`；`didAttend=true` 时槽位进入 `ATTENDED`。
- 详情页提供“公众号提醒”开关，查询/更新接口为：
  - `GET /api/wechat/reminders/subscription`
  - `POST /api/wechat/reminders/subscription`（`enabled: boolean`）
- 开启提醒后，系统会为已加入槽位调度 `T-24h` 与 `T-2h` 提醒任务。
- 退出、自动释放或关闭提醒时，系统会删除对应未执行的提醒任务（`PENDING/RETRY`）。
- 编辑内容弹窗复用同一结构化表单组件并提交更新；`READY` 及之后状态禁止任何 user-facing 内容编辑。

## 验收标准

- 首页首屏默认不展开复杂输入表单，主路径为“探索活动”。
- 首页价值点 item1 点击后可展开轻量两行 NL 表单（第一行输入，第二行 PIN + 发送）。
- 首页存在 Event Highlights 与 Event Plaza Entry，且可分别跳转 `/events/:eventId` 与 `/events`。
- 首页中段可触发“收藏网站 / 复制首页链接”提示（具备节流，避免重复打扰）。
- 首页底部保留次级动作入口（去创建页 + 联系作者）。
- `/pr/new` 页面存在头部、创建方式切换区；结构化模式下提供表单主体与页脚双动作按钮（保存/创建）。
- 结构化创建请求命中 `/api/pr`，并按按钮行为创建 `DRAFT` 或 `OPEN`。
- 新创建请求会按 `min/max` 创建槽位；当前参与人数由 `partners.pr_id` 下处于活跃状态的槽位动态聚合。
- `POST /api/pr/:id/join` 在无有效微信会话时返回 401（或 OAuth 未配置时返回 503）。
- `POST /api/pr/:id/exit` 与 join 一致校验微信会话，确保只能退出当前登录用户绑定的槽位。
- `POST /api/pr/:id/confirm` 与 `POST /api/pr/:id/check-in` 同样强制微信登录态。
- `POST /api/wechat/reminders/subscription` 在无有效微信会话时返回 401（或 OAuth 未配置时返回 503）。
- 开启提醒后会创建具备 dedupe 的延迟任务；关闭提醒后会删除对应未执行任务并返回删除数量。
- 提醒任务执行后会写入 `notification_deliveries`（包含 `result/errorCode/jobId`）。
- 已到 `T-30min` 之后，join 请求会被拒绝（400）。
- 到达 `T-1h` 且槽位未确认时，系统会在读取/操作时懒触发自动释放，保证结构状态收敛。
- 编辑弹窗与结构化创建页使用同一表单组件与同一校验逻辑。

## 涉及端

- H5 前端
- 后端
