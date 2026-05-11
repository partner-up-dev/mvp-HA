# Backend FC Meeting Point Template Env

## Objective & Hypothesis

Fix the failed `Deploy Backend to Aliyun FC` run
`25617280741` / job `75197510915`.

The job failed after migration, layer publish, and backend build succeeded.
`s deploy -y -t apps/backend/s.yaml` failed while resolving
`WECHAT_SUBMSG_MEETING_POINT_UPDATED_TEMPLATE_ID`.

Updated direction: message template ids are owned by backend `config` rows only.
Environment variables for message template ids are legacy runtime surface and
should be removed instead of extended with GitHub secret fallback behavior.

The legacy `WECHAT_REMINDER_TEMPLATE_ID` official-account template-message
channel is unused in production and should be retired.

## Guardrails Touched

- Backend deployment workflow: `.github/workflows/backend-fc-deploy.yml`
- Backend FC runtime template: `apps/backend/s.yaml`
- Backend env schema: `apps/backend/src/lib/env.ts`
- Backend WeChat notification runtime:
  - `apps/backend/src/services/WeChatSubscriptionMessageService.ts`
  - `apps/backend/src/infra/notifications/wechat-reminder.ts`
  - `apps/backend/src/infra/notifications/channels/*`
  - `apps/backend/src/controllers/wechat.controller.ts`
- Deployment truth: `docs/40-deployment/environments.md`

## Verification

- GitHub job log inspected through the GitHub connector:
  `s deploy -y -t apps/backend/s.yaml` failed with
  `RuntimeError: env('WECHAT_SUBMSG_MEETING_POINT_UPDATED_TEMPLATE_ID') not found`.
- `rg` confirmed no runtime/workflow usage of message template id env vars
  remains.
- `bash -n scripts/ci/fc/validate_backend_env.sh` passed.
- `pnpm --filter @partner-up-dev/backend exec tsx --test src/services/WeChatSubscriptionMessageService.test.ts` passed with 3 tests.
- `pnpm --filter @partner-up-dev/backend exec tsc --noEmit` passed.
- `pnpm --filter @partner-up-dev/backend build` passed.
- `pnpm --filter @partner-up-dev/backend exec tsx --test --test-concurrency=1 "src/**/*.test.ts"` passed with 66 tests.
- `git diff --check -- .github/workflows/backend-fc-deploy.yml apps/backend/s.yaml apps/backend/src/lib/env.ts apps/backend/src/services/WeChatSubscriptionMessageService.ts apps/backend/src/services/WeChatSubscriptionMessageService.test.ts apps/backend/src/services/WeChatTemplateMessageService.ts apps/backend/src/infra/notifications/channels apps/backend/src/infra/notifications/wechat-reminder.ts apps/backend/src/controllers/wechat.controller.ts docs/40-deployment/environments.md tasks/ci-backend-meeting-point-template-env/task.md` passed.

Note: an earlier parallel verification attempt ran typecheck, build, and full
unit tests at the same time and exhausted local Windows memory. Sequential
verification passed.
