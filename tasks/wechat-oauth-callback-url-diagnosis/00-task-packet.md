# WeChat OAuth Callback URL Diagnosis

## Objective & Hypothesis

- Objective: verify whether WeChat OAuth redirect_uri points to the staging backend callback or a production callback, then align callback URL inference with the public backend URL behind the deployment proxy.
- Hypothesis: staging uses the backend callback path, but the inferred public URL keeps an internal HTTP scheme; production still runs the older frontend-callback implementation.

## Guardrails Touched

- `docs/30-unit-tdd/wechat-oauth-handoff.md`: backend callback and frontend handoff invariants.
- `apps/backend/src/controllers/AGENTS.md`: WeChat OAuth callback changes must preserve callback/cookie safety.
- `docs/40-deployment/environments.md`: runtime deployment behavior for callback URL inference and override.

## Verification

- Queried staging OAuth login via `https://test.api-app.partner-up.cn/api/wechat/oauth/login?returnTo=https%3A%2F%2Ftest.app.partner-up.cn%2F`; observed `302` to WeChat with `redirect_uri=http://test.api-app.partner-up.cn/api/wechat/oauth/callback`.
- Queried production OAuth login via `https://api-app.partner-up.cn/api/wechat/oauth/login?returnTo=https%3A%2F%2Fapp.partner-up.cn%2F`; observed production commit `e5832edf5ecfb7bd53f7c4474c89e730327832c6` still returns `redirect_uri=https://app.partner-up.cn/wechat/oauth/callback`.
- Confirmed staging backend commit is `d55b0927aedb202383cddef9094a94ff456b5488`, matching current `develop`.
- Confirmed `https://test.api-app.partner-up.cn/MP_verify_bDsck6MFYTmV24vd.txt` returns the expected verification value.
- Ran `pnpm --filter @partner-up-dev/backend typecheck` successfully.

## Implementation Notes

- OAuth callback URL inference now uses a public request URL reconstructed from `x-forwarded-proto`, `x-forwarded-host`, and `host` before falling back to the raw Hono request URL.
- Backend FC deploy now passes optional `WECHAT_OAUTH_CALLBACK_URL` through GitHub environment variables into the function runtime.
- Empty `WECHAT_OAUTH_CALLBACK_URL` is parsed as absent so environments can leave the override unset.
