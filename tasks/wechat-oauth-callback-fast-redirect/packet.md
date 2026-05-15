# WeChat OAuth Callback Fast Redirect

## Objective & Hypothesis

Reduce WeChat login latency observed between the WeChat authorization page and the backend callback `302`.

Hypothesis:

- callback correctness only requires validating OAuth state, exchanging `code` for `openid`, resolving/binding/creating the user, and issuing the handoff redirect
- `sns/userinfo` profile fetch can run after the redirect as best-effort enrichment because nickname, sex, and avatar are not required for session correctness

## Guardrails Touched

- Backend WeChat OAuth callback and handoff invariants
- User `open_id` binding and anonymous-user upgrade
- User profile persistence for WeChat nickname, sex, and avatar

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend test:unit`
