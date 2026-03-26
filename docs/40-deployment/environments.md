# Environments

## Backend Runtime

The backend is deployed to Aliyun Function Compute using Serverless Devs.

Current runtime facts:

- runtime: `custom.debian12`
- HTTP server listens on port `3000`
- backend code package is built into `apps/backend/.fc-package`
- production `node_modules` are delivered through a separate FC layer
- `BACKEND_COMMIT_HASH` is injected by deploy/runtime config so build metadata remains available without `.git`
- OSS is mounted at `/mnt/oss`
- timezone is `Asia/Shanghai`

## Environment Split

### `develop`

- deploy target: staging environment in GitHub Actions
- FC behavior: deploy to function `LATEST`
- migrations run before deploy

### `master`

- deploy target: production environment in GitHub Actions
- FC behavior: deploy to `LATEST`, then publish immutable function version, then update `production` alias
- migrations run before deploy

## Database Environment Model

- schema source of truth: Drizzle entities + committed SQL artifacts
- forward-only schema/data migration model in staging and production
- migration execution happens through a dedicated FC migration function inside the VPC

## Job Runner Trigger Environment

There is a separate FC deployment for the external job-runner trigger function:

- deployed from `apps/backend/fc-job-runner-trigger`
- calls the backend internal tick endpoint on a cron schedule
- has its own GitHub Actions workflow and FC function name/URL variables

## Frontend Deployment Truth

The frontend is deployed to Aliyun ESA.

Current durable facts we can state:

- deployment target: Aliyun ESA
- repo deployment descriptor: `apps/frontend/esa.jsonc`
- frontend builds to `apps/frontend/dist`
- backend runtime depends on `FRONTEND_URL` for OAuth/share link generation

The repo does not currently document a full CI/CD workflow for frontend ESA rollout with the same level of detail as backend FC deploy.
