#!/usr/bin/env bash
set -euo pipefail

rm -rf apps/backend/fc-db-migrate/.fc-package
mkdir -p apps/backend/fc-db-migrate/.fc-package

cp apps/backend/fc-db-migrate/db-migrate-handler.cjs apps/backend/fc-db-migrate/.fc-package/
cp apps/backend/package.json apps/backend/fc-db-migrate/.fc-package/
cp apps/backend/dist-fc-db-migrate/db-migrate.js apps/backend/fc-db-migrate/.fc-package/
cp apps/backend/dist-fc-db-migrate/db-migrate.js.map apps/backend/fc-db-migrate/.fc-package/
cp -R apps/backend/drizzle apps/backend/fc-db-migrate/.fc-package/
cp -R apps/backend/data-migrations apps/backend/fc-db-migrate/.fc-package/
