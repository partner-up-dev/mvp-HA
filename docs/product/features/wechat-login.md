# 功能：微信登录（后端鉴权驱动）

## 用户故事

- 作为在微信内访问页面的用户，我希望需要微信身份的动作由后端统一判定，并在未登录时引导我完成登录。
- 作为产品方，我希望后端具备可复用的微信 OAuth 会话基础设施，为后续用户能力扩展打底。
- 作为已拥有本地账户的用户，我希望能在“我的”页把当前账户绑定到微信，而不是切换成另一个账号。

## 流程

- 用户在微信 WebView 打开任意页面（首页、`/cpr/new`、`/cpr/:id`、`/apr/:id` 等）。
- 前端不再在页面启动阶段做微信登录前置判断；需要微信身份的动作先直连业务 API。
- 后端在动作接口上统一判定微信会话；若未登录则返回 `401 + code=WECHAT_AUTH_REQUIRED`（或 OAuth 未配置返回 `503 + code=WECHAT_OAUTH_NOT_CONFIGURED`）。
- 前端根据接口返回的 `status + error code` 决定是否重定向到 `GET /api/wechat/oauth/login`，并携带当前页面地址作为 `returnTo`。
- 后端生成并校验 OAuth state（签名 cookie），跳转微信授权地址（`snsapi_userinfo`）。
- 微信回调 `GET /api/wechat/oauth/callback`，后端用 `code` 换取 `openid` + OAuth access token；若为新用户（`users.open_id` 不存在）会调用 `sns/userinfo` 拉取 `nickname/sex/avatar` 并落库，再签发 HttpOnly 会话 cookie，最后跳回 `returnTo` 页面。
- “我的”页在微信内可调用 `GET /api/wechat/oauth/bind?returnTo=...` 发起绑定模式：
  - 前端先用当前 Bearer token 请求该接口，后端把 `bindUserId + returnTo + mode=bind` 写入签名 state cookie，并返回微信授权地址。
  - 回调 `GET /api/wechat/oauth/callback` 在 `mode=bind` 时不会切换账户，只会把回调得到的 `openid` 绑定到当前本地账户。
  - 若该 `openid` 已绑定其他用户，则绑定失败，回跳 `returnTo` 并附带 `wechatBind=conflict`；系统不做自动合并。
- 需要清理会话时，前端可调用 `POST /api/wechat/oauth/logout`。
- Anchor PR 参与相关接口会同时校验「本地 authenticated 会话 + 微信 OAuth 会话」：
  - 若缺少本地 authenticated 会话，返回 `401 + code=ANCHOR_USER_AUTH_REQUIRED`
  - 若缺少微信 OAuth 会话，返回 `401 + code=WECHAT_AUTH_REQUIRED`（未配置且非 mock 时返回 `503 + code=WECHAT_OAUTH_NOT_CONFIGURED`）
  - 若两者均存在但账户与 openid 不一致，返回 `401 + code=WECHAT_BIND_REQUIRED`
  - 相关接口：`/api/apr/:id/join`、`/api/apr/:id/exit`、`/api/apr/:id/confirm`、`/api/apr/:id/check-in`

## 验收标准

- 无需新增登录页/注册页/用户页。
- 微信登录判断以后端接口响应为准，前端不做动作前置鉴权短路。
- 后端提供会话查询、登录跳转、回调换取、登出清理四个接口。
- 后端额外提供绑定入口 `GET /api/wechat/oauth/bind`，并复用同一个 `/api/wechat/oauth/callback` 处理 bind 模式。
- Anchor PR 的 join/exit/confirm/check-in 必须同时满足本地 authenticated 会话与微信 OAuth 会话；若当前 authenticated 用户尚未绑定 openid，可在 OAuth 会话存在时完成绑定后继续。
- 新用户首次微信登录时，后端会一次性保存用户资料字段：`nickname`、`sex`、`avatar`。
- 已存在用户重复登录时，不重复拉取并覆盖用户资料。
- 绑定模式不会覆盖当前用户已手动修改的昵称与头像。
- 绑定模式若命中已被占用的 `openid`，必须失败返回，且两个账户都不发生变更。
- OAuth state 与会话 token 均为签名数据，不允许明文可篡改。
- 已登录用户重复进入页面时不会再次触发授权跳转。
- 未配置微信 OAuth 所需环境变量时，系统不会进入重定向死循环。
- 未登录重定向逻辑由业务接口错误码触发，非微信环境不会在页面启动阶段主动跳转。
- 基础环境变量为 `WECHAT_OFFICIAL_ACCOUNT_APP_ID`、`WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`、`WECHAT_AUTH_SESSION_SECRET`。

## 涉及端

- H5 前端
- 后端

## 开发调试约定（非生产）

- 本地开发可开启后端环境变量 `WECHAT_DEV_MOCK_ENABLED=true`，并可通过 `WECHAT_DEV_MOCK_OPEN_ID` 指定固定 mock openid。
- 开启后，`GET /api/wechat/oauth/login` 会先重定向到后端 mock 授权地址 `GET /api/wechat/oauth/mock/authorize`，再回到 `GET /api/wechat/oauth/callback` 完成 session cookie 签发（openid 取 `WECHAT_DEV_MOCK_OPEN_ID`）。
- 该能力仅用于非生产调试；生产环境必须保持关闭。
