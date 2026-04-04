# AGENTS.md of PartnerUp MVP-HA (Backend)

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用领域驱动分层（Domain-oriented Layered Architecture），控制器只做协议转换，业务逻辑拆分为独立 use-case 函数，领域规则归位到 domain service。跨领域关注点（事件、任务、日志、埋点）由 infra 层统一提供。

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + @hono/zod-validator
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to dist/)

## Architecture

```text
Controller  ──►  UseCase (per domain)  ──►  Domain Service  ──►  Repository  ──►  Entity
                        │
                        ├──►  Event Bus  ──►  Outbox Writer  ──►  Outbox Worker
                        ├──►  Operation Log Service
                        └──►  Analytics Ingestor
```

Background tasks are managed by a DB-backed JobRunner (delayed jobs + due-job claiming). In scale-to-0 serverless, execution is driven by internal tick endpoints and request-tail best-effort kicks instead of in-process intervals.

## File Structure

```text
src/
├── entities/             # Drizzle schema definitions (partner-request, partner, user, config, domain-event, outbox-event, operation-log, job)
├── repositories/         # Data access layer (pure CRUD)
├── services/             # Legacy service facades (thin wrappers delegating to domains/)
├── domains/
│   └── pr-core/          # PartnerRequest lifecycle domain
│       ├── use-cases/    # One function per business action (create, join, exit, confirm, check-in, etc.)
│       ├── services/     # Domain services (time-window, status-rules, slot-management, user-resolver, pr-view)
│       ├── services/pr-read.service.ts  # Centralized PR read entrypoint with strong/eventual consistency
│       └── temporal-refresh.ts  # Shared temporal status refresh logic
├── infra/
│   ├── events/           # Domain Event Bus + Outbox writer/worker (INFRA-02)
│   ├── jobs/             # Unified JobRunner (INFRA-03)
│   ├── analytics/        # Analytics event ingestion (INFRA-04)
│   └── operation-log/    # Operation log service (INFRA-05)
├── controllers/          # Hono routes + validation (no business logic)
├── lib/                  # DB engine + utilities
└── index.ts              # Entrypoint, mounts routes, request-tail maintenance, exports AppType
```

## Documents

Read following documents when needed and keep them current:

- `docs/20-product-tdd/*.md`
- `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant

## Development Guidelines

- Entity Layer (src/entities): see `src/entities/AGENTS.md`
- Repository Layer (src/repositories): see `src/repositories/AGENTS.md`
- Domain Use-Cases (src/domains/): **new code should import use-cases directly** instead of going through service facades.
- Controller Layer (src/controllers): see `src/controllers/AGENTS.md`
- Infra Layer (src/infra/): event bus, job runner, analytics ingest, operation log — cross-cutting concerns.
- Better not use interval, background jobs, the backend is being deployed in a scale-to-0 serverless.

## Database Workflow

- Drizzle remains the schema source of truth. Generated schema SQL lives in `drizzle/`.
- Hand-authored forward-only data migrations live in `data-migrations/`.
- `pnpm db:migrate` runs the custom migration runner and records applied schema/data migrations in `app_migrations`.
- CI/CD deploys and invokes a dedicated FC migration function inside the VPC, but it still calls the same migration runner as `pnpm db:migrate`.
- `pnpm db:lint` validates migration/seed file naming and transaction-mode rules before deploy.
- `pnpm db:next-migration <drizzle|data-migrations>` prints the next global numeric prefix shared by both migration folders.
- `pnpm db:reset` is local-only. It drops and recreates the local database, applies all migrations, then runs seeds.
- `pnpm db:seed` reruns all files in `seeds/`, so every seed file must be idempotent.
- If a migration file contains `CONCURRENTLY`, it must include `-- migration: no-transaction`.
- Staging and production are forward-only. Do not add reset logic or env-specific migration folders.
- Production schema changes should follow expand/backfill/contract discipline.

## Best Practice Checklist

1. Strict Typing: Any `c.req.param()` / `c.req.json()` must be validated via `zValidator`.
2. No Logic in Controllers: Controllers only do HTTP/protocol conversion; logic lives in domain use-cases.
3. JSON Response: Always return via `c.json()` so RPC can infer types.
4. Error Handling: Use global `app.onError` to unify error response shapes.
5. Domain Events: Key business actions must emit domain events via `eventBus.publish()` + `writeToOutbox()`.
6. Operation Logs: Use `operationLogService.log()` (fire-and-forget) for audit trail on domain actions.
7. Background Jobs: Persist delayed jobs through `jobRunner.scheduleOnce()` and drive execution via tick endpoints / request-tail kick — never use raw `setInterval`.

## Product And Runtime Truth Sources

Keep this file operational (architecture, workflow, coding rules) and avoid using it as a feature-state mirror.

For durable truth, use:

- Product what/why, workflows, and invariants: `docs/10-prd/**/*.md`
- Cross-unit technical truth and contracts: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`

For volatile implementation status or migration notes:

- record them in active `docs/task/<task>/` packets
- keep this file limited to stable backend operating guidance
