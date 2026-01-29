# AGENTS.md of PartnerUp MVP-HA's frontend

本项目是一个基于 Vue 3 的前端应用，使用 Hono RPC Client 与后端通信，并利用 TanStack Vue Query 进行服务端状态管理。

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (hc)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Coding Guidelines

### Type Safety

- RPC Infer Type: Do not manually define Interfaces for API returns; let TypeScript infer from Hono Client.
- Request Params: If backend uses zValidator, mismatched param types (e.g., string to number) will cause type errors—do not bypass with `as any`.

### API Calls

- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.

## Distributed Documentation

- Data Fetching: See [src/queries/AGENTS.md](src/queries/AGENTS.md).
- Components: See [src/components/AGENTS.md](src/components/AGENTS.md).
