# L2 Plan

## Interfaces & Contracts

### Endpoint: GET /api/wecom/message

**Query**

- `msg_signature`: string
- `timestamp`: string
- `nonce`: string
- `echostr`: string (encrypted)

**Behavior**

- Verify signature with `token`, `timestamp`, `nonce`, `echostr`.
- Decrypt `echostr` to plaintext.
- Return plaintext as plain text response.

### Endpoint: POST /api/wecom/message

**Query**

- `msg_signature`: string
- `timestamp`: string
- `nonce`: string

**Body**

- XML with `<Encrypt>` element (encrypted payload).

**Behavior**

- Verify signature with `token`, `timestamp`, `nonce`, `Encrypt`.
- Decrypt XML into message payload.
- Support `MsgType=text` only; ignore other types with `ok`.
- Extract `FromUserName`, `AgentID`, `CreateTime`, `Content`.
- `nowIso` = `new Date(CreateTime * 1000).toISOString()`.
- Generate `pin`: 4 digits (string, leading zeros allowed).
- Call `PartnerRequestService.createPRFromNaturalLanguage(Content, pin, nowIso)`.
- Build URL: `${FRONTEND_URL}/pr/${id}` (ensure protocol).
- Immediately respond `ok`.
- Async send message to `FromUserName` via WeCom API with share URL + PIN.

## New Modules

### apps/backend/src/lib/wecom-crypto.ts

- `verifySignature({ token, timestamp, nonce, encrypted }) => boolean` using SHA1.
- `decryptMessage({ encodingAesKey, corpId, encrypted }) => { xml: string }`.
- `encryptMessage({ encodingAesKey, corpId, plaintextXml, timestamp, nonce }) => { encrypted, msgSignature }` (for future; optional now).

> Implement AES-256-CBC with PKCS#7 padding as per WeCom docs.

### apps/backend/src/services/WeComService.ts

- `getAppAccessToken(): Promise<string>` using `corpId` + `appSecret`.
- `sendTextMessage({ agentId, toUser, content }): Promise<void>`.
- Format: `POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=...`.

## Data Structures

- `WeComCallbackQuerySchema` (zod): `msg_signature`, `timestamp`, `nonce`, `echostr?`.
- `WeComEncryptedBody` (parsed from XML): `Encrypt`.
- `WeComDecryptedMessage` (parsed from XML): `FromUserName`, `ToUserName`, `CreateTime`, `MsgType`, `Content`, `AgentID`, `MsgId`.

## Controller Logic (pseudocode)

1. Parse query with zod.
2. For GET: validate & decrypt `echostr`, return plaintext.
3. For POST: parse XML to get `Encrypt`, verify signature, decrypt.
4. Parse decrypted XML to fields; if `MsgType` != `text`, return `ok`.
5. Call PR creation (async). `return c.text('ok')` immediately.
6. After PR creation, call `WeComService.sendTextMessage`.

## Dependencies

- XML parser (existing or new): check existing packages; otherwise add a small XML parser (fast-xml-parser) to backend.

## Error Handling

- Invalid signature/decrypt: return 400 `Invalid signature` or `Decrypt failed`.
- Any downstream failures: log and swallow for webhook response.

## Testing Plan

- Unit: signature verification + decrypt with known fixtures.
- Manual: WeCom URL verification, then send a text message to app and receive async response.

## Open Decisions

- XML parser choice if none exists.

## Next Step

Await approval to draft L3 implementation plan.
