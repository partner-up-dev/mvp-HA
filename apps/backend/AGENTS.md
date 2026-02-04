# AGENTS.md of PartnerUp MVP-HA (Backend)

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用经典分层（Layered Architecture），并在路由层适配了 Hono RPC 的类型推断机制。

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + @hono/zod-validator
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to dist/)

## Architecture

Controller -> Service -> Repository -> Entity

## File Structure

src/
├── entities/        # Drizzle schema definitions
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── controllers/     # Hono routes + validation (no business logic)
├── lib/             # DB engine + utilities
└── index.ts         # Entrypoint, mounts routes and exports AppType

## Development Guidelines

- Entity Layer (src/entities): see `src/entities/AGENTS.md`
- Repository Layer (src/repositories): see `src/repositories/AGENTS.md`
- Service Layer (src/services): see `src/services/AGENTS.md`
- Controller Layer (src/controllers): see `src/controllers/AGENTS.md`

## Best Practice Checklist

1. Strict Typing: Any `c.req.param()` / `c.req.json()` must be validated via `zValidator`.
2. No Logic in Controllers: Controllers only do HTTP/protocol conversion; logic lives in Services.
3. JSON Response: Always return via `c.json()` so RPC can infer types.
4. Error Handling: Use global `app.onError` to unify error response shapes.

## WeChat JS-SDK

- Endpoint: `GET /api/wechat/jssdk-signature?url=...`
- Env:
  - `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
  - `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
  - `WECHAT_HTTP_PROXY` (optional, routes WeChat API requests via HTTP proxy)
- Notes:
  - `access_token` and `jsapi_ticket` are cached in-memory with expiry.

## Upload Storage

- Poster uploads are saved to `POSTERS_DIR` if provided.
- Default: `/mnt/oss/posters` on Linux, `./posters` on Windows.
