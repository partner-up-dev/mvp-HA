# 产品概览

## 产品是什么

PartnerUp MVP-HA 是一个协作效率产品（H-A）：把“群里的一句话”冻结成可被加入、可自然结束的协作 PartnerRequest（对外称“搭子请求”）。它不是 App / 社区 / 平台，而是嵌入既有对话与行为的协作触发器，目标是验证协作是否值得被工程化。

## 核心形态

- 一次性 PartnerRequest 页面拆分为两类：
  - Community PR：`/cpr/:id`
  - Anchor PR：`/apr/:id`
- Partner roster 支持查看参与者资料页：
  - Community Partner Profile：`/cpr/:id/partners/:partnerId`
  - Anchor Partner Profile：`/apr/:id/partners/:partnerId`
- Community PR 与 Anchor PR 共享 Partner 参与机制、时间窗口与人数阈值，但页面、字段与业务规则分开演进。
- Anchor PR 额外提供「预订与资助」页：`/apr/:id/booking-support`
- 内部管理端提供：
  - `/admin/login` 用于 admin 使用 UUID + PIN 登录
  - `/admin/anchor-pr` 用于维护 Anchor Event / Batch / Anchor PR
  - `/admin/booking-support` 用于维护预订与资助资源模板与批次覆盖
  - `/admin/pois` 用于维护全局 POI 库与 POI Gallery

## 合法使用路径

- 打开别人发来的 PartnerRequest 链接。
- 在首页浏览活动亮点或进入活动广场，获得灵感后决定是否发起 PartnerRequest。
- 点击首页价值点「从一句话开始」可展开内联自然语言创建表单（两行：NL 输入 + 发送），直接创建 PartnerRequest。
- 也可通过首页次级 CTA 进入 `/cpr/new`，创建 Community PR（统一先创建草稿，再发布）。
- 进入 `/pr/mine` 可查看“我创建的 / 我加入的”搭子请求列表（前端对重复项做去重展示）。
- 进入 `/events` 与 `/events/:eventId` 可浏览 Anchor Event，并从中进入 Anchor PR 页面。
- 当前版本不提供手动创建 Anchor PR 的独立页面；Anchor PR 由 Anchor Event 侧流程生成。
- 运营与配置人员可通过内部管理端桌面页面维护 Anchor Event / Batch / Anchor PR、全局 POI 库与 Gallery、预订资助配置。
- 发布 `DRAFT` 时会为创建者绑定用户身份并生成/确保用户 PIN；后续匿名编辑内容/状态时使用用户 PIN 验证。
- 进入网页时会通过 `localStorage` 中的 `user-id/user-pin` 自动恢复会话；若不存在本地凭据则保持匿名，会在第一次发布搭子请求时创建本地账户并登录。
- 点击首页或页面底部“联系作者”，进入 `/contact-support`；在该页可选择“联系客服”（报销/投诉）或跳转 `/contact-author` 反馈功能建议与 Bug。
- 从历史 PartnerRequest 再发一个。
- 对外分享或线下二维码可附带 `spm` 归因参数；若首个打开页面带有合法 `spm`，当前浏览器会话内的后续埋点会继续沿用该归因。
- 在微信相关动作（如 Anchor PR 参与、提醒订阅等）中，系统由后端统一校验「JWT authenticated 会话 + 用户已绑定微信 openid」；未绑定时引导微信绑定 OAuth。
- 在 Community PR 详情页执行“加入/退出”时，系统使用本地账户 + PIN 机制；若当前没有本地账户，会在首次加入时自动创建。
- 在 Anchor PR 详情页执行“加入/退出 / 确认参与 / 签到”时，系统会强制校验「本地 authenticated 会话 + 用户已绑定微信 openid」。
- 在 Community / Anchor PR 的参与名单中，每条 roster item 展示头像 + 昵称；点击后可进入该参与者资料页（只读）。
- Community PR 详情页仅提供 `join/exit`。
- Anchor PR 详情页提供 `join/exit`、确认参与与可选签到（到场/未到场）反馈，用于可靠性与信任回流。
- Anchor PR 与 `/me` 页面共用“通知订阅”卡片，当前包含 3 个全局开关：`REMINDER_CONFIRMATION`（公众号提醒）、`BOOKING_RESULT`（场地预订结果）、`NEW_PARTNER`（新搭子）。
- `REMINDER_CONFIRMATION` 开启后会按 `T-24h` 与 `T-2h` 触发服务号订阅通知提醒（模板消息通道保留为兼容兜底），关闭后会清理未执行提醒任务。
- `NEW_PARTNER` 开启后，当你已加入的 Anchor PR 有新参与者加入时会触发服务号订阅通知。
- `BOOKING_RESULT` 当前仅支持开关持久化，发送链路待后续预订处理控制台接入。
