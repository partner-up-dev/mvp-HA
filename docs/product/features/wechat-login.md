# 功能：微信登录（自动尝试）

## 用户故事

- 作为在微信内访问页面的用户，我希望系统自动尝试完成微信登录，而不是先进入登录页。
- 作为产品方，我希望后端具备可复用的微信 OAuth 会话基础设施，为后续用户能力扩展打底。

## 流程

- 用户在微信 WebView 打开任意页面（首页、详情页、创建页等）。
- 前端应用启动后调用 `GET /api/wechat/oauth/session` 检查当前登录态。
- 若微信 OAuth 基础设施未配置，或当前已登录，则保持当前页面，不跳转。
- 若已配置且当前未登录，前端重定向到 `GET /api/wechat/oauth/login`，并携带当前页面地址作为 `returnTo`。
- 后端生成并校验 OAuth state（签名 cookie），跳转微信授权地址（`snsapi_base`）。
- 微信回调 `GET /api/wechat/oauth/callback`，后端用 `code` 换取 `openid`，签发 HttpOnly 会话 cookie，再跳回 `returnTo` 页面。
- 需要清理会话时，前端可调用 `POST /api/wechat/oauth/logout`。

## 验收标准

- 无需新增登录页/注册页/用户页。
- 微信内访问页面时，应用会自动尝试登录。
- 后端提供会话查询、登录跳转、回调换取、登出清理四个接口。
- OAuth state 与会话 token 均为签名数据，不允许明文可篡改。
- 已登录用户重复进入页面时不会再次触发授权跳转。
- 未配置微信 OAuth 所需环境变量时，系统不会进入重定向死循环。
- 自动尝试逻辑仅在微信内置 WebView 触发，非微信浏览器不触发跳转。
- 基础环境变量为 `WECHAT_OFFICIAL_ACCOUNT_APP_ID`、`WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`、`WECHAT_AUTH_SESSION_SECRET`。

## 涉及端

- H5 前端
- 后端
