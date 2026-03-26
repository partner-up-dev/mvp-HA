# Coordination Model

## Primary Coordination Path

1. Browser enters a frontend route.
2. Frontend bootstraps local session state and route-specific processes.
3. Frontend calls backend HTTP endpoints through Hono RPC clients.
4. Backend validates input, executes use cases, persists state, and emits side effects.
5. Frontend updates local cache/UI based on responses and invalidation.

## Coordination Mechanisms

### Frontend To Backend

- type-safe Hono RPC clients: `client` and `adminClient`
- Bearer access tokens in `Authorization`
- cookie-backed flows via `credentials: "include"` where WeChat/auth state is involved
- route params and payloads typed from the backend workspace package

### Backend Internal Coordination

- controllers -> use cases -> domain services -> repositories/entities
- outbox writer and event bus for business events
- DB-backed job runner for delayed/background work
- request-tail best-effort draining plus `/internal/jobs/tick` for scale-to-0 execution

### Backend To External Systems

- Postgres for authoritative persistence
- WeChat Official Account APIs for OAuth, JS-SDK signature, and subscription messaging
- WeCom app callbacks for inbound message-driven PR creation
- LLM provider for natural-language parsing/generation

### Frontend To Browser/Platform APIs

- `localStorage` and `sessionStorage`
- Web Share API
- WeChat WebView/OAuth and related browser redirects

## Coordination Principle

Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts. The frontend may optimize UX, but not author new domain truth.
