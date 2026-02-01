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

## WeChat JS-SDK Share

- In WeChat WebView, sharing cards are customized via WeChat JS-SDK.
- Backend endpoint used by frontend:
  - `GET /api/wechat/jssdk-signature?url=...`
- Required backend env:
  - `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
  - `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
- Frontend loads JS-SDK from:
  - `https://res.wx.qq.com/open/js/jweixin-1.6.0.js`

## Distributed Documentation

- Data Fetching: See `src/queries/AGENTS.md`.
- Components: See `src/components/AGENTS.md`.

