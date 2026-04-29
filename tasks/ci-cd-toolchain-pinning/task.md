# CI/CD Toolchain Pinning

## Objective & Hypothesis

Pin the CI/CD toolchain versions and move GitHub Actions Node execution away
from Node 20 deprecation risk.

Hypothesis: making Node, pnpm, GitHub Action majors, and Serverless Devs
versions explicit reduces runner drift while preserving the current deploy
behavior.

## Guardrails Touched

- Workflow runner setup: `.github/workflows/*.yml`
- Package manager source of truth: `package.json`
- Deploy helper scripts: `scripts/ci/fc/common.sh`
- Deployment docs: `docs/40-deployment/rollout.md`

## Verification

- Inspect workflows for remaining `node-version: 20` and Node20 action majors.
- Run package manager and build/typecheck checks under the available local
  toolchain.
- Shell syntax check for touched deploy helper script.

## Verification Results

- No remaining `node-version: 20`, `actions/*@v4`, `setup-python@v5`,
  `pnpm/action-setup@v4`, or `release-please-action@v4` matches in workflows.
- Verified remote tags exist for `actions/checkout@v6`, `actions/setup-node@v6`,
  `actions/setup-python@v6`, `pnpm/action-setup@v6`, and
  `googleapis/release-please-action@v5`.
- `bash -n` passed for touched deploy helper scripts.
- `pnpm install --frozen-lockfile` passed after switching local nvm to Node
  22.21.1.
- Backend `tsc --noEmit` and frontend `vue-tsc --noEmit` passed.
- Frontend token lint passed.
- Backend deploy dry-run prints pinned `@serverless-devs/s@3.1.10`.
