# WeChat Domain Verification File Sync

## Objective & Hypothesis

- Objective: make backend root path `/XdiIXm3WSq.txt` return exactly the same content as frontend `public/XdiIXm3WSq.txt` so WeChat Mini Program domain verification can pass on both hosts.
- Hypothesis: backend should serve the verification token as raw plain text without extra characters, and deployment packaging must include the same verification file so runtime behavior matches local development.

## Guardrails Touched

- Typed input: `Reality`.
- Active mode: `Execute`.
- Durable owner: backend operational root route plus deployment packaging.
- Local backend constraints: keep controller/domain boundaries intact; do not introduce business logic for a static operational asset.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- Node import check for `getWechatDomainVerificationContent()` returns the same 32-byte token as `apps/frontend/public/XdiIXm3WSq.txt`
- `pnpm --filter @partner-up-dev/backend build`
- `bash scripts/ci/fc/prepare_fc_package.sh` places the verification file under `apps/backend/.fc-package/verification/XdiIXm3WSq.txt`
