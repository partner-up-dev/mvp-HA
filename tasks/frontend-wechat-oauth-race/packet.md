# Frontend WeChat OAuth Race

## Objective & Hypothesis

Route auto-login and RPC auth-required handling can both start WeChat OAuth during PR page load. Centralizing OAuth login redirects behind a frontend single-flight policy and making route auto-login wait for auth bootstrap should remove duplicate redirect races.

## Guardrails Touched

- WeChat OAuth handoff unit
- Frontend auth bootstrap
- PR route auto-login
- RPC auth-required policy

## Verification

- 2026-05-14: `pnpm --filter @partner-up-dev/frontend test:unit` passed.
- 2026-05-14: `pnpm --filter @partner-up-dev/frontend build` passed.
