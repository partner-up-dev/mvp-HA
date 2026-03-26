# Backend Interfaces

## Inbound Interfaces

### Public HTTP

- auth and user routes under `/api/auth` and `/api/users`
- PR routes under `/api/pr`, `/api/cpr`, `/api/apr`
- event, share, upload, config, meta, analytics, POI, WeChat, WeCom, and admin route families
- admin route families include booking-execution workspace/query surfaces such as `GET /api/admin/booking-execution/workspace` and `POST /api/admin/anchor-prs/:id/booking-execution`
- `/api/meta/build` exposes repository URL and backend commit hash for runtime-facing product surfaces such as `/about`

### Internal HTTP

- `/internal/jobs/tick` for externally triggered due-job execution

## Outbound Interfaces

- Postgres via repositories/entities
- WeChat Official Account APIs for OAuth, JS-SDK signature, and subscription messaging, including `BOOKING_RESULT`
- WeCom callback and reply APIs
- LLM provider APIs for natural-language parsing/generation

## Exported Compile-Time Interface

The backend exports:

- `AppType` for frontend Hono RPC typing
- selected domain/entity types and schemas for frontend compile-time reuse

This exported TS surface is part of the unit’s interface contract and should be treated carefully.
