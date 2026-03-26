# Cross-Unit Contracts

## 1. Typed HTTP Contract

- Backend exports `AppType` from `apps/backend/src/index.ts`.
- Frontend creates Hono RPC clients with `hc<AppType>()`.
- Backend also exports selected domain/entity types for frontend compile-time reuse.

Contract implication:

- route shape, payload shape, and many response shapes are shared by type, not duplicated manually
- contract-breaking API changes are compile-time visible to the frontend workspace

## 2. Session Contract

- frontend stores local user/admin access tokens in `localStorage`
- backend may rotate tokens through the `x-access-token` response header
- frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth/bind paths
- admin and user sessions are separate client contexts

## 3. Error Contract

- backend global errors resolve to JSON with at least `{ error }` and optionally `{ code }`
- frontend interprets status + optional `code` to drive UX, especially for WeChat auth-required flows and join/booking errors

## 4. Route Contract

User-facing canonical routes include:

- `/cpr/:id`
- `/apr/:id`
- `/apr/:id/booking-support`
- `/events`
- `/events/:eventId`
- `/pr/mine`
- `/me`
- admin routes under `/admin/*`

Backend route families under `/api/*` must continue to support those surfaces coherently.

Admin booking execution introduces an additional cross-unit contract family:

- frontend admin workspace reads one workspace payload containing `pendingItems` and merged `auditItems`
- backend provides that workspace through `GET /api/admin/booking-execution/workspace`
- frontend submits one execution result per Anchor PR
- backend accepts that through `POST /api/admin/anchor-prs/:id/booking-execution`
- the contract includes notification summary fields so frontend/admin UX can render fulfillment outcome without recomputing backend state

This is a cross-unit contract first, and the backend/frontend unit docs should inherit it rather than define it independently.

## 5. Configuration And Metadata Contract

- backend exposes public config values through `/api/config/public/:key`
- backend exposes build metadata through `/api/meta/build`
- frontend relies on those endpoints to avoid hardcoding operationally managed values

## 6. Analytics And Attribution Contract

- frontend captures `spm` attribution and session-level analytics context in browser storage
- frontend sends analytics events to backend ingestion endpoints
- backend preserves raw attribution payload for downstream analysis
