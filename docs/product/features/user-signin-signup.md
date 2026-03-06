# 功能：用户登录与注册（本地凭据 + 首次发布注册）

## 用户故事

- 作为回访用户，我希望打开网页后能自动恢复登录状态，不需要重复输入凭据。
- 作为首次访问用户，我希望不需要先手动注册，也能先创建草稿；在第一次发布搭子请求时再自动完成注册并登录。
- 作为匿名创建者，我希望在编辑状态/内容时可通过用户 PIN 校验身份，并在校验后升级为登录态。

## 流程

- 前端应用启动后自动调用 `POST /api/auth/session`：
  - 若 Bearer token 有效且为 authenticated，直接返回 authenticated 会话。
  - 若请求中携带本地凭据（`user-id` + `user-pin`）且校验通过，返回 authenticated 会话。
  - 若存在有效微信 OAuth 会话，解析/绑定用户后返回 authenticated 会话。
  - 否则返回 anonymous 会话（不创建账户）。
- 前端将 `user-id`、`user-pin`、`access-token`、`role` 持久化到 localStorage；后续请求自动携带 Bearer token，并通过响应头 `x-access-token` 静默轮换 token。
- 创建路径统一为“先草稿、再发布”：
  - `POST /api/pr` 与 `POST /api/pr/natural_language` 只创建 `DRAFT`。
  - 用户点击创建（或自然语言创建自动流程）后调用 `POST /api/pr/:id/publish`。
- 发布时的创建者认领规则：
  - authenticated：使用当前用户并确保存在用户 PIN。
  - 微信 OAuth：使用微信用户并确保存在用户 PIN。
  - 无任何登录态：创建本地用户、生成用户 PIN，并签发 authenticated token。
- 创建者编辑接口（状态/内容）：
  - authenticated：无需 PIN。
  - anonymous：需提供用户 PIN；校验通过后升级并返回 authenticated token。

## 验收标准

- 系统无独立“登录页/注册页”，页面进入后自动进行会话恢复尝试。
- 没有本地凭据且没有微信会话时，`POST /api/auth/session` 返回 anonymous，不创建用户。
- 首次发布搭子请求（`POST /api/pr/:id/publish`）时，若无登录态则自动创建本地用户并返回 `user-id/user-pin/access-token`。
- 后续刷新页面时，若 localStorage 中有有效 `user-id/user-pin`，可通过 `POST /api/auth/session` 静默恢复 authenticated 会话。
- `PATCH /api/pr/:id/status` 与 `PATCH /api/pr/:id/content` 在 anonymous 角色下要求 PIN；PIN 正确后响应包含升级后的 authenticated token。
- localStorage 中的 token 可通过 `x-access-token` 自动轮换，无需用户手动重新登录。

## 涉及端

- H5 前端
- 后端
