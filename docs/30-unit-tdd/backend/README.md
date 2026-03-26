# Backend Unit

## Role

The backend unit realizes authoritative product behavior for PartnerUp MVP-HA.

It exposes the system API, owns persistence and domain transitions, and coordinates background and external side effects.

## Owns

- Hono HTTP routes under `/api/*` and `/internal/*`
- domain use cases and domain services
- Postgres persistence through entities/repositories
- auth/session issuance and verification
- WeChat, WeCom, analytics, share-generation, and config-facing integrations
- outbox, job runner, notifications, and operation logs

## Depends On

- Postgres
- environment configuration
- external providers such as WeChat, WeCom, and LLM endpoints

## Does Not Own

- browser routing
- local browser persistence UX
- page composition and route-level UI concerns
