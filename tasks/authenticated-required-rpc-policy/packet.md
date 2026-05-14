# Authenticated Required RPC Policy

## Objective & Hypothesis

Fix PR join-gate and other user command flows that surface raw session errors by moving authentication-required handling into shared system mechanisms.

Hypothesis:

- backend exceptions should serialize as Problem Details with stable codes
- user commands that require the `authenticated` role should return `AUTHENTICATED_REQUIRED`
- the Hono RPC client fetch layer should trigger the existing WeChat OAuth login when it receives `401 + AUTHENTICATED_REQUIRED`

## Guardrails Touched

- Backend error contract and global error handler
- User session and authenticated role semantics
- WeChat OAuth login/handoff entry
- Frontend RPC client request/response policy
- PR join-gate, join, waitlist, publish, and other commands that use shared RPC client transport

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm test:backend:unit`

Frontend has no existing unit-test runner in this workspace. The RPC policy is kept in small pure functions for future unit coverage when a frontend test runner is introduced.

## Known Risks

- 2026-05-14: The shared frontend `AUTHENTICATED_REQUIRED` policy still starts WeChat OAuth from the RPC response layer. This is acceptable for explicit user-command mutations, but remains risky if a page-init query, prefetch, or other non-user-initiated request returns `401 + AUTHENTICATED_REQUIRED`, because it could trigger `snsapi_userinfo` without clear user intent. Follow-up should move this redirect decision to explicit command/use-case owners or otherwise gate it behind a user action.
