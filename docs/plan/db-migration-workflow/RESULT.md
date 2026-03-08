# Database Migration Workflow Result

## Implemented

1. Added a custom backend DB toolchain under `apps/backend/src/scripts/db/`:
   - `migrate.ts`
   - `reset.ts`
   - `seed.ts`
   - `lint.ts`
   - `next-migration.ts`
   - shared file discovery, advisory lock, checksum, and ledger helpers
2. Replaced deploy-time `drizzle-kit migrate` usage with a custom runner that:
   - merges `drizzle/` and `data-migrations/`
   - records applied schema/data migrations in `app_migrations`
   - validates duplicate numeric prefixes
   - enforces the `CONCURRENTLY` plus `-- migration: no-transaction` rule
3. Added local seed/reset support and tracked folders:
   - `apps/backend/data-migrations/README.md`
   - `apps/backend/seeds/README.md`
4. Updated package commands in backend and workspace root:
   - `db:lint`
   - `db:migrate`
   - `db:reset`
   - `db:seed`
   - `db:next-migration`
5. Added CI/CD integration:
   - new PR workflow `.github/workflows/backend-db-validate.yml`
   - updated deploy workflow `.github/workflows/backend-fc-deploy.yml` with a dedicated migration job before FC deploy
6. Updated backend and deployment docs to describe the new forward-only workflow.

## Verification

- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --filter @partner-up-dev/backend db:next-migration drizzle`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`

## Notes

- `db:migrate`, `db:seed`, and `db:reset` were not executed against a live database in this task.
- Existing historical Drizzle SQL files remain as-is; the schema/data split applies to new migrations going forward.
