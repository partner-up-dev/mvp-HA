# CI/CD pnpm 10 Deploy Compatibility

## Objective & Hypothesis

Fix the latest backend deploy CI failure caused by pnpm 10 `deploy`
workspace requirements.

Hypothesis: enabling `injectWorkspacePackages` at the workspace level lets
`pnpm deploy` use the pnpm 10 implementation without `--legacy`, preserving
the backend FC layer packaging command and avoiding a long-term legacy
exception.

## Guardrails Touched

- Package manager workspace configuration: `pnpm-workspace.yaml`
- Backend FC node_modules layer packaging behavior:
  `scripts/ci/fc/prepare_node_modules_layer.sh`
- GitHub Actions backend deploy workflow runtime behavior

## Verification

- Dry-run `pnpm deploy` with `inject-workspace-packages=true` into a temporary
  directory before mutating repository files.
- Run `pnpm install --frozen-lockfile`.
- Run backend production dependency deploy into a temporary directory using
  the repository config.
- Run backend build.
- Run frontend build to cover the frontend's workspace dependency on backend
  exported types.
- Push and observe the real backend deploy workflow result.

## Verification Results

- Pre-change dry-run passed with:
  `pnpm --config.inject-workspace-packages=true --filter @partner-up-dev/backend deploy --prod --node-linker=hoisted <temp>`
- Initial clean-worktree frozen install showed the lockfile also needs the
  workspace setting recorded as `settings.injectWorkspacePackages: true`.
- `pnpm install --no-frozen-lockfile` updated only the lockfile settings
  section for `injectWorkspacePackages`.
- Clean-worktree `pnpm install --frozen-lockfile` passed with pnpm 10.28.1.
- Clean-worktree backend layer dry-run passed with:
  `pnpm --filter @partner-up-dev/backend deploy --prod --node-linker=hoisted <temp>`
- Clean-worktree backend build passed.
- Clean-worktree frontend build passed.
- GitHub Actions run `25164988485` passed the original pnpm deploy failure,
  published backend node_modules layer version 60, then failed during backend
  function `s deploy` because `WECHAT_OAUTH_CALLBACK_URL` was referenced with
  `env('WECHAT_OAUTH_CALLBACK_URL')` while the GitHub environment value was
  absent.
- Serverless Devs YAML supports `${env('NAME', 'default')}` defaults. Backend
  optional runtime env references should use an empty-string default so the
  backend env schema can continue to parse empty optional values as absent.
- Local `npx -y @serverless-devs/s@3.1.10 verify -t apps/backend/s.yaml`
  with dummy required env values passed variable resolution and reached the
  existing `tags/0` schema casing check.
