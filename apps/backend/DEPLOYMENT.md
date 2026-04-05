# DEPLOYMENT of PartnerUp MVP-HA Backend

- Aliyun RDS PostgreSQL (Serverless version)
- Aliyun FC + Custom Runtime + Custom Layer (with CICD)
- Aliyun FC internal migration function `db_migrate` (template: `apps/backend/fc-db-migrate/s.yaml`; runs DB migrations inside FC VPC)
- Aliyun FC timer function `job_runner_trigger` (template: `apps/backend/fc-job-runner-trigger/s.yaml`; recommended target is backend `/internal/maintenance/tick`, `/internal/jobs/tick` remains as jobs-only compatibility path, supports comma-separated multi URL via `ALIYUN_FC_JOB_RUNNER_TICK_URL`)
- Aliyun OSS (Auto-cleanup)

## Database Migration Workflow

- Schema SQL is generated from Drizzle entities into `apps/backend/drizzle/` and committed in the same PR as the schema change.
- Forward-only data migrations live in `apps/backend/data-migrations/` and share the same numeric prefix sequence as schema migrations.
- The deploy pipeline deploys and invokes a dedicated FC migration function before backend FC deploy, and records applied migrations in `app_migrations`.
- The migration job takes a Postgres advisory lock so only one migration runner applies changes per deploy.
- Staging and production are forward-only. If a migration fails, deploy stops and recovery is done with a forward fix, not reset.
- Local development uses `pnpm db:reset`, which recreates the local database, reapplies all migrations, and then runs idempotent seeds from `apps/backend/seeds/`.
