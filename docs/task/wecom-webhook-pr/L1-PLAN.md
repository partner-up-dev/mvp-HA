# L1 Plan

## Strategy Overview

Implement a WeCom (enterprise WeChat) self-built app callback endpoint at `/api/wecom/message` with encrypted callback support and URL verification. The endpoint will:

- Verify and decrypt inbound messages using `WECOM_TOKEN`, `WECOM_ENCODING_AES_KEY`, and `WECOM_CORP_ID`.
- Extract `Content` and timestamp to call `PartnerRequestService.createPRFromNaturalLanguage`.
- Generate a random 4-digit PIN per request and return it via async WeCom message.
- Build share URL as `https://FRONTEND_URL/pr/{prId}`.
- Respond to callbacks immediately (within ~1s) with `ok` to satisfy WeCom timeout requirements.

## Architectural Decisions

1. **Controller-only webhook**: Keep protocol handling in a dedicated controller; all business logic remains in services.
2. **WeCom crypto helper**: Add a small utility module for signature verification + AES decrypt/encrypt to keep controller concise and testable.
3. **Async reply**: Use WeCom app message send API (application access token) to send result after PR creation.
4. **Env-driven config**: All secrets and URLs sourced from environment variables.

## Required Additions

- **New controller**: `wecom.controller.ts` with GET (URL verification) and POST (message callbacks).
- **New service/helper**: `WeComCryptoService` (or `wecom-crypto.ts`) to verify signature and decrypt/encode XML.
- **WeCom API client**: minimal functions for `gettoken` and `message/send`.
- **Env schema updates**: add WeCom config + `FRONTEND_URL`.
- **Docs**: update product or backend docs to mention the endpoint and required env vars.

## Data Flow

1. GET `/api/wecom/message`:
   - Validate `msg_signature`, `timestamp`, `nonce`, `echostr`.
   - Verify signature and decrypt `echostr`.
   - Return plaintext for URL verification.
2. POST `/api/wecom/message`:
   - Validate query params (`msg_signature`, `timestamp`, `nonce`).
   - Decrypt XML payload and extract message content + `FromUserName` + `AgentID` + `CreateTime`.
   - Convert `CreateTime` to `nowIso`.
   - Generate random 4-digit PIN.
   - Call `createPRFromNaturalLanguage(rawText, pin, nowIso)`.
   - Immediately return `ok`.
   - Use WeCom API to send async result (share URL + pin) to `FromUserName`.

## Env Variables (proposed)

- `FRONTEND_URL`
- `WECOM_TOKEN`
- `WECOM_ENCODING_AES_KEY`
- `WECOM_CORP_ID`
- `WECOM_APP_AGENT_ID`
- `WECOM_APP_SECRET`

## Error Handling

- Invalid signature or decrypt failure: respond 400.
- If async send fails, log error; do not fail the webhook response.
- Keep controller responses JSON or plain text as required by WeCom verification.

## Testing Plan

- Manual: simulate GET URL verification with known params.
- Manual: POST encrypted callback payload and confirm async message delivery.
- Unit: crypto verify/decrypt roundtrip with known fixtures (if available).

## Open Items

- Confirm if we should support only `MsgType=text` or extend to other message types (default: text-only).
- Confirm expected format of share URL: `https://FRONTEND_URL/pr/{prId}` vs direct use of `FRONTEND_URL` (already includes scheme).

## Next Step

Await approval for L1; then prepare L2 low-level design.
