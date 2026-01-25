# AGENTS.md of PartnerUp MVP-HA

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用了经典的分层架构 (Layered Architecture)，但在路由层适配了 Hono RPC 的类型推断机制。

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
├── entities/       # Drizzle Schema Defintion
├── repositories/   # Data Access Layer  
├── services/       # Business Logic Layer
├── controllers/    # Router and HTTP stuff (Define Hono routes，parameter validation)  
├── types/          # Global type defintion
├── lib/            # Utils (DB engine, common utlities)  
└── index.ts        # Entrypoint, aggregating routes and export AppType

## Development Guidelines

- Entity Layer (src/entities), see [src/entities/AGENTS.md](src/entities/AGENTS.md)
- Repository Layer (src/repositories), see [src/repositories/AGENTS.md](src/repositories/AGENTS.md)
- Service Layer (src/services), see [src/services/AGENTS.md](src/services/AGENTS.md)
- Controller Layer (src/controllers), see [src/controllers/AGENTS.md](src/controllers/AGENTS.md)

## Best Practice Checklist

1. Strict Typing: 任何 c.req.param 或 c.req.json 必须通过 zValidator 验证。  
2. No Logic in Controllers: Controller 只负责 HTTP 协议转换，逻辑全部下沉到 Service。  
3. JSON Response: 所有的返回必须使用 c.json()，确保 RPC 能够推断返回类型。  
4. Error Handling: 使用全局 app.onError 捕获异常，确保返回格式统一。
