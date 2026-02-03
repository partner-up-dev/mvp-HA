# L2 Plan — Technical Design (Interfaces, Schemas, Algorithms)

## Backend API

### New endpoints (share service)

- `POST /api/share/xiaohongshu/poster-html`
- `POST /api/share/wechat-card/thumbnail-html`

**Request schemas (Zod)**

Xiaohongshu poster HTML:

```ts
const xhsPosterHtmlRequestSchema = z.object({
  prId: z.coerce.number().int().positive(),
  style: z.coerce.number().int().optional(),
  caption: z.string().min(1).max(120),
});
```

WeChat card thumbnail HTML:

```ts
const wechatCardThumbnailHtmlRequestSchema = z.object({
  prId: z.coerce.number().int().positive(),
  style: z.coerce.number().int().optional(),
});
```

**Response schema (Zod)**

```ts
const posterHtmlResponseSchema = z.object({
  html: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  backgroundColor: z.string().optional(),
  meta: z
    .object({
      // Used mainly for WECHAT_THUMB
      keyText: z.string().optional(), // <= 3 chars OR 1 emoji
    })
    .optional(),
});
```

### Data source (prId-only)

- Backend resolves `prId` using `PartnerRequestService.getPR(prId)` (returns `rawText`, `parsed`, `status`, etc.).
- Frontend never sends `prData` to this endpoint.

### Style prompts (3 variants, configurable)

Use config table via `ConfigService.getJsonArrayOrFallback()`.

Proposed config keys:

- `share.xiaohongshu_poster_html_style_prompts` → JSON array of **3** system prompts
- `share.wechat_card_thumbnail_html_style_prompts` → JSON array of **3** system prompts

Requirements for prompts:

- Non-marketing, trust-worthy, user-authored feel.
- Clear hard constraints per target:
  - XHS: 2:3, text very large, caption content is the provided `caption`.
  - WeChat: 1:1, simple shapes + **≤3 chars** OR **1 emoji**, pick from PR context.

### Prompt contract for generated HTML

LLM output must satisfy:

- Single complete HTML document string.
- Uses **inline CSS only** (`<style>` is allowed; no external stylesheets).
- No scripts: forbid `<script>`, `javascript:` URLs, inline event handlers (`onload`, `onclick`, etc.).
- No external resources: no remote images/fonts. Prefer **no `<img>`** at all.
- Must include exactly one root element: `<div id="poster-root">...</div>` with fixed size.

### Backend validation (deny-list)

Before returning, backend rejects output if it matches any of:

- `<script` (case-insensitive)
- `on\w+\s*=` (inline handlers)
- `javascript:`
- `<link` (stylesheets)
- `<iframe` (nested iframes)

This is not the only safety layer (frontend will sandbox too), but it prevents obvious bad output early.

## Frontend rendering pipeline

### New utility/composable

Create `renderPosterHtmlToBlob()` (or `useRenderHtmlPoster`) that:

1. Creates a hidden iframe.
2. Writes HTML via `iframe.srcdoc`.
3. Waits for `load` + best-effort `document.fonts?.ready`.
4. Locates `#poster-root` in the iframe document.
5. Calls `html2canvas(root, { width, height, scale, backgroundColor })`.
6. Converts to PNG `Blob`.

### iframe sandbox + CSP

- `iframe.sandbox = "allow-same-origin"` (no scripts allowed; we only need DOM access).
- Inject CSP into `srcdoc`:
  - `default-src 'none'`
  - `style-src 'unsafe-inline'`
  - `img-src data:` (optional; ideally we don’t use images)
  - `font-src data:` (optional; ideally no custom fonts)

### Frontend sanitization (belt-and-suspenders)

Before assigning `srcdoc`, run the same deny-list checks as backend. If hit → throw → fallback.

### Target sizes + scale

- XHS poster: 2:3, e.g. `width=720 height=1080 scale=2` (effective high-res).
- WeChat thumb: 1:1, e.g. `width=300 height=300 scale=2` (or `512×512 scale=1`).
(Exact constants to be finalized in L3 with your earlier “LGTM” choice.)

## Integrations + fallback behavior

### Xiaohongshu flow

1. Generate caption via existing `/api/llm/xiaohongshu-caption` (for clipboard and also poster content).
2. Call `/api/share/xiaohongshu/poster-html` with `{ prId, caption, style }`.
3. Try HTML iframe rendering → PNG.
4. **WeChat browser special case (must keep current behavior):** if running inside WeChat browser, upload the generated PNG to backend (`/api/upload/poster`) and use the returned download URL for preview/long-press save/share.
5. If any step fails (LLM, validation, rendering): fallback to current template-based `useGeneratePoster(caption, style)`.

Notes:

- Outside WeChat browser, it is acceptable to use `blob:` URLs for preview/download.
- Inside WeChat browser, always prefer backend-hosted URLs because WeChat has limitations sharing `blob:` resources.

### WeChat share flow

1. Call `/api/share/wechat-card/thumbnail-html` with `{ prId, style }`.
2. Try HTML iframe rendering → PNG.
3. If fails: fallback to a template-based generator suitable for **1:1** (either extend existing template generator with a preset or add a small dedicated template).
4. Upload PNG → `imgUrl` → configure JS-SDK.

WeChat browser requirement:

- The thumbnail image **must** be uploaded to backend to obtain a public URL (`imgUrl`), otherwise WeChat share card will not work.

## Type-safety constraints

- No `any` in new code.
- Use exported backend types (`PRId`, `ParsedPartnerRequest`) where needed.

## Deliverables (what changes in code)

- Backend: add share routes + share service methods (calls LLM) + config keys.
- Frontend: new HTML→PNG renderer + share components updated to pass `prId` + fallback logic.

## Target Architecture

```ascii
                         ┌───────────────────────────────┐
                         │        apps/frontend           │
                         │   (Vue + Vite, html2canvas)    │
                         └───────────────┬───────────────┘
                                         │
                                         │ user selects share method
                                         v
                           ┌────────────────────────────┐
                           │ SharePR.vue                │
                           │ - chooses method tab       │
                           └───────────┬────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │                                                     │
            v                                                     v
┌───────────────────────────────┐                   ┌───────────────────────────────┐
│ ShareToXiaohongshu.vue         │                   │ ShareToWechatChat.vue         │
│ - caption textarea + copy link │                   │ - generates + updates JS-SDK   │
│ - poster preview + download    │                   │ - preview thumb               │
└───────────────┬───────────────┘                   └───────────────┬───────────────┘
                │                                                   │
                │ (1) caption for clipboard                          │ (A) optional: caption? (not required)
                │                                                   │
                v                                                   v
     ┌───────────────────────────┐                      ┌───────────────────────────┐
     │ queries/useGenerateX...    │                      │ composables/useWeChatShare │
     │ POST /api/llm/xhs-caption  │                      │ - GET /api/wechat/signature│
     └──────────────┬────────────┘                      │ - set share card imgUrl    │
                    │                                   └──────────────┬────────────┘
                    │ caption                                               │ needs imgUrl (must be URL)
                    v                                                      v
    ┌──────────────────────────────────────────────┐          ┌───────────────────────────┐
    │ queries/useGenerateXhsPosterHtml (new)        │          │ composables/useCloudStorage│
    │ POST /api/share/xiaohongshu/poster-html       │          │ POST /api/upload/poster    │
    │ - params: prId + style + caption             │          │ -> download URL             │
     └──────────────────────────────┬───────────────┘          └──────────────┬────────────┘
                                    │                                          │
                                    │ poster html spec                          │
                                    v                                          v
                     ┌──────────────────────────────────┐       ┌───────────────────────────┐
                     │ composables/renderHtmlPoster (new)│       │ WeChat JS-SDK share card   │
                     │ HTML -> sandbox iframe -> canvas  │       │ uses imgUrl from upload    │
                     │ -> PNG Blob                       │       └───────────────────────────┘
                     └───────────────┬──────────────────┘
                                     │
                        try/catch    │ failure
                                     v
                   ┌────────────────────────────────────┐
                   │ composables/useGeneratePoster (old) │
                   │ Vue template -> html2canvas -> Blob │
                   │ (fallback)                          │
                   └────────────────────────────────────┘


WeChat-browser special rule (both flows):
- If running inside WeChat browser: always upload generated PNG Blob via useCloudStorage
  and use the returned backend URL (not blob:) for preview/share.
```

```ascii
                         ┌───────────────────────────────┐
                         │         apps/backend           │
                         │     (Hono + Drizzle + AI SDK)  │
                         └───────────────┬───────────────┘
                                         │
          ┌──────────────────────────────┼───────────────────────────────┐
          │                              │                               │
          v                              v                               v
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│ controllers/share.controller│ │ controllers/upload.ctrl   │  │ controllers/wechat.ctrl   │
│ POST /llm/xhs-caption       │ │ POST /upload/poster       │  │ GET /wechat/jssdk-signature│
│ POST /share/xhs/poster-html │ │ GET  /upload/download/:k  │  └──────────────┬────────────┘
│ POST /share/wechat/thumb    │ └───────────────────────────┘                 │
└──────────────┬─────────────┘                                               │
               │                                                              │
               v                                                              v
     ┌───────────────────────────┐                              ┌───────────────────────────┐
  │ services/ShareService (new)│                              │ services/WeChatJssdkService│
  │ - genXhsPosterHtml         │                              │ - createSignature          │
  │ - genWechatThumbHtml       │                              └───────────────────────────┘
  └──────────────┬────────────┘
        │ calls
        v
  ┌───────────────────────────┐
  │ services/LLMService        │
  │ - generateXhsCaption       │
  │ - generateXhsPosterHtml    │
  │ - generateWechatThumbHtml  │
  └──────────────┬────────────┘
                    │ needs PR context (by prId)
                    v
     ┌───────────────────────────┐          ┌───────────────────────────┐
     │ services/PartnerRequestSvc │          │ services/ConfigService     │
     │ - getPR(prId)              │          │ - getJsonArrayOrFallback   │
     └──────────────┬────────────┘          └──────────────┬────────────┘
                    │                                      │
                    v                                      v
     ┌───────────────────────────┐          ┌───────────────────────────┐
     │ repositories/PartnerReqRepo│          │ repositories/ConfigRepo    │
     │ - findById                 │          │ - findValueByKey            │
     └───────────────────────────┘          └───────────────────────────┘
```
