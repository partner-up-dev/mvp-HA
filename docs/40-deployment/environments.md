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

## WeChat Notification Template Sources

Subscription-message template ids for confirmation-reminder / activity-start-reminder /
booking-result / new-partner / pr-message
can be supplied from either:

- backend `config` rows:
  - `wechat.submsg_confirmation_reminder_template_id`
  - `wechat.submsg_activity_start_reminder_template_id`
  - `wechat.submsg_booking_result_template_id`
  - `wechat.submsg_new_partner_template_id`
  - `wechat.submsg_pr_message_template_id`
- backend environment variables with the same semantic mapping:
  - `WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID`
  - `WECHAT_SUBMSG_ACTIVITY_START_REMINDER_TEMPLATE_ID`
  - `WECHAT_SUBMSG_BOOKING_RESULT_TEMPLATE_ID`
  - `WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID`
  - `WECHAT_SUBMSG_PR_MESSAGE_TEMPLATE_ID`

The `config` table remains the higher-priority source; env vars are operational
fallbacks when the DB config row is absent.

## Environment Split

### `develop`

- deploy target: staging environment in GitHub Actions
- FC behavior: deploy to function `LATEST`
- migrations run before deploy

### `master`

- deploy target: production environment in GitHub Actions
- FC behavior: deploy to `LATEST`, then publish immutable function version, then update `production` alias
- migrations run before deploy
- backend GitHub Release is created only after production alias publication succeeds

## Database Environment Model

- schema source of truth: Drizzle entities + committed SQL artifacts
- forward-only schema/data migration model in staging and production
- migration execution happens through a dedicated FC migration function inside the VPC

## Job Runner Trigger Environment

There is a separate FC deployment for the external job-runner trigger function:

- deployed from `apps/backend/fc-job-runner-trigger`
- calls the backend internal maintenance tick endpoint on a cron schedule
- has its own GitHub Actions workflow and FC function name/URL variables

## Frontend Deployment Truth

The frontend is deployed to Aliyun ESA.

Current durable facts we can state:

- deployment target: Aliyun ESA
- repo deployment descriptor: `apps/frontend/esa.jsonc`
- frontend builds to `apps/frontend/dist`
- backend runtime depends on `FRONTEND_URL` for share link generation
- WeChat OAuth callback defaults to the backend `/api/wechat/oauth/callback` URL inferred from the OAuth start request and forwarded public host / protocol headers

The repo does not currently document a full CI/CD workflow for frontend ESA rollout with the same level of detail as backend FC deploy.

Frontend GitHub Releases are source releases only in the current pull-based ESA
deployment model.
