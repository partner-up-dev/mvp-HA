# L0 Plan

## Understanding

Goal: add a backend endpoint to accept WeCom (enterprise WeChat) self-built app webhook callbacks, extract the user message content, and call `PartnerRequestService.createPRFromNaturalLanguage`. Then build a share URL as `https://FRONTEND_URL/pr/{prId}`. If passive replies are supported, return a card in the same response within 3-5 seconds; if handling will exceed the limit, return `ok` and send the result later via WeCom API.

## Current State Review

- Backend is Hono-based; controllers use `zValidator` for validation.
- `PartnerRequestService.createPRFromNaturalLanguage(rawText, pin, nowIso)` creates a PR and returns `{ id }`.
- No existing WeCom webhook controller or `FRONTEND_URL` env in backend config.

## Open Questions / Clarifications Needed

1. WeCom callback type: is this **self-built app callback** (server callback) or **WeCom group robot webhook**? The request body format and verification differ.
2. Are callbacks **encrypted** (using `token` + `encodingAESKey`)? If yes, we need those credentials and must implement decrypt/verify.
3. Which input should map to `pin` and `nowIso` for `createPRFromNaturalLanguage`?
   - Pin requirement is strict 4 digits; do we generate a fixed pin (e.g., `0000`), extract from message, or use a config?
4. How to reply:
   - For passive replies: which card type is acceptable (news, text notice, template card)?
   - For proactive (async) replies: which WeCom API should be used, and do we have `corpId`, `agentId`, and `secret`?
5. Expected endpoint path (e.g., `/api/wecom/webhook`)?
6. Do we need URL verification (GET with `echostr`)?

## Proposed Artifacts (after approval)

- New controller for WeCom webhook callbacks.
- Env additions for `FRONTEND_URL` and (if encrypted) `WECOM_TOKEN`, `WECOM_ENCODING_AES_KEY`, `WECOM_CORP_ID`, plus app credentials for async reply.
- Optional service/helper for WeCom crypto/response formatting.
- Documentation update in backend or product docs if needed.

## Next Step

Await your answers to the questions above, then proceed to L1 strategy.
