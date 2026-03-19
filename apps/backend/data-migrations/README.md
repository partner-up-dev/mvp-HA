# Data Migrations

This folder contains forward-only data migrations executed by the custom database runner.

Rules:

- Use `<global-prefix>_<name>.sql` file names.
- Prefixes are shared with `apps/backend/drizzle/`.
- Files in this folder are applied through `pnpm db:migrate` and recorded in `app_migrations`.
- Use `pnpm db:next-migration data-migrations` to get the next numeric prefix.
- If a file contains `CONCURRENTLY`, it must include `-- migration: no-transaction`.
- Staging and production are forward-only. Do not put reset logic here.
