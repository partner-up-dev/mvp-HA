# Backend Interfaces

## Inbound Interfaces

### Public HTTP

- auth and user routes under `/api/auth` and `/api/users`
- PR routes under `/api/pr`, `/api/cpr`, `/api/apr`
- event, share, upload, config, meta, analytics, POI, WeChat, WeCom, and admin route families

### Internal HTTP

- `/internal/jobs/tick` for externally triggered due-job execution

## Outbound Interfaces

- Postgres via repositories/entities
- WeChat Official Account APIs for OAuth, JS-SDK signature, and subscription messaging
- WeCom callback and reply APIs
- LLM provider APIs for natural-language parsing/generation

## Exported Compile-Time Interface

The backend exports:

- `AppType` for frontend Hono RPC typing
- selected domain/entity types and schemas for frontend compile-time reuse

This exported TS surface is part of the unit’s interface contract and should be treated carefully.
