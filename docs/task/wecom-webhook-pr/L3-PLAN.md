# L3 Plan

## Implementation Steps

1. **Add env variables**
   - Update env schema in `apps/backend/src/lib/env.ts` to include:
     - `FRONTEND_URL`
     - `WECOM_TOKEN`
     - `WECOM_ENCODING_AES_KEY`
     - `WECOM_CORP_ID`
     - `WECOM_APP_AGENT_ID`
     - `WECOM_APP_SECRET`

2. **Implement WeCom crypto utility**
   - Create `apps/backend/src/lib/wecom-crypto.ts` with:
     - `verifySignature` (SHA1 token+timestamp+nonce+encrypted)
     - `decryptMessage` (AES-256-CBC, PKCS#7)
     - `parseXml` helpers (or use `fast-xml-parser`)

3. **Implement WeCom API service**
   - Create `apps/backend/src/services/WeComService.ts`:
     - `getAppAccessToken` (corpId+secret)
     - `sendTextMessage` (agentId, toUser, content)

4. **Add WeCom controller**
   - Create `apps/backend/src/controllers/wecom.controller.ts`:
     - GET `/message` (URL verification)
     - POST `/message` (encrypted message callback)
     - Validate query with zod
     - Parse body to get `Encrypt` (XML)
     - Call `PartnerRequestService.createPRFromNaturalLanguage`
     - Immediately respond `ok`
     - Async send reply via `WeComService`

5. **Mount route**
   - Update `apps/backend/src/index.ts` to mount `/api/wecom`.

6. **Docs**
   - Update `docs/product/features/share-to-wechat.md` or add a backend doc snippet for the new webhook and envs.

## Pseudocode (controller)

```ts
const query = wecomQuerySchema.parse(c.req.query());
if (isGet) {
  verifySignature(query, echostr);
  const plaintext = decryptEchostr(echostr);
  return c.text(plaintext);
}

const { Encrypt } = parseXml(body);
verifySignature(query, Encrypt);
const decryptedXml = decryptMessage(Encrypt);
const msg = parseXml(decryptedXml);
if (msg.MsgType !== 'text') return c.text('ok');

const nowIso = new Date(Number(msg.CreateTime) * 1000).toISOString();
const pin = generatePin();
const { id } = await prService.createPRFromNaturalLanguage(msg.Content, pin, nowIso);
const url = `${frontendUrl}/pr/${id}`;

c.text('ok'); // respond fast
await wecomService.sendTextMessage({ toUser: msg.FromUserName, agentId, content: `...${url}...${pin}` });
```

## Validation & Edge Cases

- Reject empty content or missing fields (return `ok` for non-text).
- Ensure `FRONTEND_URL` has protocol; if not, prepend `https://`.
- Generate PIN with leading zeros allowed.

## Tests

- Manual call for GET URL verification.
- Manual callback with sample encrypted payload.
- Ensure async reply works via WeCom app.

## Next Step

Proceed to implementation after approval.
