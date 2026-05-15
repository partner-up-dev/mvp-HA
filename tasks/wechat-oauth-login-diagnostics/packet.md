# WeChat OAuth Login Diagnostics

## Objective & Hypothesis

Add temporary frontend console diagnostics for staging WeChat OAuth login latency.

Hypothesis:

- login latency can be isolated by measuring frontend redirect request, callback page handling, handoff exchange, and auth bootstrap timings
- console output should avoid OAuth secrets, user identifiers, access tokens, `code`, `state`, `openid`, and query strings

## Guardrails Touched

- Frontend WeChat OAuth login and bind entry
- Frontend OAuth handoff gate
- Frontend auth session bootstrap
- Frontend OAuth callback compatibility page

## Verification

- `pnpm --filter @partner-up-dev/frontend build`
