# AGENTS.md of PartnerUp MVP-HA (Backend)

This file stays backend-operational only. Root request routing, typed input classification, and mode selection are owned by the repository root `AGENTS.md` plus `docs/00-meta/`.

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + `@hono/zod-validator`
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to `dist/`)

## Architecture

The backend uses a domain-oriented layered architecture:

```text
Controller  ──►  Domain Use Case  ──►  Domain Service  ──►  Repository  ──►  Entity
                           │
                           ├──►  Event Bus  ──►  Outbox Writer  ──►  Outbox Worker
                           ├──►  Operation Log Service
                           └──►  Analytics Ingestor
```

Background tasks are managed by a DB-backed JobRunner (delayed jobs plus due-job claiming). In scale-to-0 serverless, execution is driven by internal tick endpoints and request-tail best-effort kicks instead of in-process intervals.

## File Structure

```text
src/
├── entities/             # Drizzle schema definitions
├── repositories/         # Data access layer (pure CRUD)
├── services/             # Legacy service facades and integration-oriented services
├── domains/
│   └── pr-core/          # PartnerRequest lifecycle domain
│       ├── use-cases/    # One function per business action
│       ├── services/     # Domain services
│       ├── services/pr-read.service.ts
│       └── temporal-refresh.ts
├── infra/
│   ├── events/           # Domain Event Bus + Outbox writer/worker
│   ├── jobs/             # Unified JobRunner
│   ├── analytics/        # Analytics event ingestion
│   └── operation-log/    # Operation log service
├── controllers/          # Hono routes + validation (no business logic)
├── lib/                  # DB engine + utilities
└── index.ts              # Entrypoint, mounts routes, request-tail maintenance, exports AppType
```

## Documents

Read the smallest useful set and keep durable docs current:

- Root route and mode guidance: `AGENTS.md`, then `docs/00-meta/*`
- Product truth: `docs/10-prd/**/*.md`
- Cross-unit technical truth: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant
- Active task packets and temporary reasoning: `tasks/*`
- Local backend constraints:
  - `src/entities/AGENTS.md`
  - `src/repositories/AGENTS.md`
  - `src/controllers/AGENTS.md`
  - `src/services/AGENTS.md`

## Development Guidelines

- Entity layer (`src/entities`): schema and boundary validation ownership; see `src/entities/AGENTS.md`.
- Repository layer (`src/repositories`): pure CRUD only; see `src/repositories/AGENTS.md`.
- Domain use-cases (`src/domains/*/use-cases`): new business actions should be added here directly rather than through `src/services` facades.
- Domain services (`src/domains/*/services`): domain rules and reusable domain logic belong here.
- Controller layer (`src/controllers`): protocol conversion only; see `src/controllers/AGENTS.md`.
- Infra layer (`src/infra`): event bus, job runner, analytics ingest, and operation log.
- Better not use intervals or in-process background jobs; the backend runs in scale-to-0 serverless.

## Database Workflow

- Drizzle remains the schema source of truth. Generated schema SQL lives in `drizzle/`.
- Hand-authored forward-only data migrations live in `data-migrations/`.
- `pnpm db:migrate` runs the custom migration runner and records applied schema and data migrations in `app_migrations`.
- CI/CD deploys and invokes a dedicated FC migration function inside the VPC, but it still calls the same migration runner as `pnpm db:migrate`.
- `pnpm db:lint` validates migration and seed file naming plus transaction-mode rules before deploy.
- `pnpm db:next-migration <drizzle|data-migrations>` prints the next global numeric prefix shared by both migration folders.
- `pnpm db:reset` is local-only. It drops and recreates the local database, applies all migrations, then runs seeds.
- `pnpm db:seed` reruns all files in `seeds/`, so every seed file must be idempotent.
- If a migration file contains `CONCURRENTLY`, it must include `-- migration: no-transaction`.
- Staging and production are forward-only. Do not add reset logic or env-specific migration folders.
- Production schema changes should follow expand / backfill / contract discipline.

## Best Practice Checklist

1. Strict typing: any `c.req.param()` or `c.req.json()` must be validated via `zValidator`.
2. No logic in controllers: controllers only do HTTP and protocol conversion; domain logic lives in domain use-cases and domain services.
3. JSON response: always return via `c.json()` so RPC can infer types.
4. Error handling: use global `app.onError` to unify error response shapes.
5. Domain events: key business actions must emit domain events via `eventBus.publish()` plus `writeToOutbox()`.
6. Operation logs: use `operationLogService.log()` (fire-and-forget) for audit trail on domain actions.
7. Background jobs: persist delayed jobs through `jobRunner.scheduleOnce()` and drive execution via tick endpoints or request-tail kick; never use raw `setInterval`.

## Product And Runtime Truth Sources

Keep this file operational and avoid using it as a feature-state mirror.

For durable truth, use:

- Product what/why, workflows, rules, and business vocabulary: `docs/10-prd/**/*.md`
- Cross-unit technical truth and contracts: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`

For volatile implementation status or migration notes:

- record them in active `tasks/<task>/` packets
- keep this file limited to stable backend operating guidance
