# WeChat OAuth Login Loading Modal

## Objective & Hypothesis

Show a persistent frontend loading modal while WeChat OAuth login is in progress.

Hypothesis: storing a small pending marker before the OAuth redirect and clearing it only after the handoff applies the returned auth session will cover both pre-redirect and return/handoff latency without changing the OAuth contract or adding user-cancel behavior.

## Guardrails Touched

- `docs/30-unit-tdd/wechat-oauth-handoff.md`
- `apps/frontend/src/processes/wechat/AGENTS.md`
- OAuth login redirect single-flight behavior
- Handoff success path and local auth session storage
- App root process-level overlay composition

## Verification

- Frontend unit tests for OAuth login and auth-required redirect policy.
- Existing route auto-login tests to keep redirect orchestration stable.
- Token governance if new component styling is added.

2026-05-14:

- `pnpm --dir apps/frontend test:unit -- src/processes/wechat/oauth-login.test.ts src/shared/api/auth-required-policy.test.ts src/processes/wechat/useRouteWeChatAutoLogin.test.ts` passed.
- `pnpm --dir apps/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
