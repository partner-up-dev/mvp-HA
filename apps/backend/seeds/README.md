# Seeds

This folder contains local bootstrap SQL executed by `pnpm db:seed` and `pnpm db:reset`.

Rules:

- Use `<prefix>_<name>.sql` file names.
- Seed files run every time the seed command is executed, so they must be idempotent.
- Prefer `insert ... on conflict do update` or `insert ... on conflict do nothing`.
- Do not put staging or production migration logic here.
- Seed files are not recorded in `app_migrations`.

Current local bootstrap account:

- Admin UUID: `00000000-0000-0000-0000-000000000001`
- Admin PIN: `admin123`
