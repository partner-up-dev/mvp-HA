# L3 Plan — Implementation Plan (Concrete Steps + Test Plan)

This plan implements the L2 design with two share endpoints:

- XHS poster HTML: `POST /api/share/xiaohongshu/poster-html`
- WeChat card thumbnail HTML: `POST /api/share/wechat-card/thumbnail-html`

…and a single frontend renderer:

- HTML → sandboxed iframe → html2canvas → PNG Blob

## A. Backend changes (apps/backend)

### A1) Add controller: `src/controllers/share.controller.ts`

Routes:

1) `POST /xiaohongshu/poster-html`

- Body: `{ prId, style?, caption }`
- Returns: `{ html, width, height, backgroundColor?, meta? }`

1) `POST /wechat-card/thumbnail-html`

- Body: `{ prId, style? }`
- Returns: `{ html, width, height, backgroundColor?, meta? }`

Notes:

- Implement using `zValidator('json', schema)`.
- Return 400 for invalid input; 404 if PR not found; 500 for LLM failures.

### A2) Add service: `src/services/ShareService.ts`

Responsibilities:

- Fetch PR by `prId` via `PartnerRequestService.getPR(prId)`.
- Compose prompts and call LLM methods.
- Apply deny-list validation on returned HTML.

Public methods:

- `generateXiaohongshuPosterHtml(params: { prId: PRId; caption: string; style?: number }): Promise<PosterHtmlResponse>`
- `generateWeChatCardThumbnailHtml(params: { prId: PRId; style?: number }): Promise<PosterHtmlResponse>`

Where `PosterHtmlResponse` is a local type matching the API response schema.

### A3) Extend `src/services/LLMService.ts`

Add two methods (no `any`):

- `generateXiaohongshuPosterHtml(args: { pr: PartnerRequestPublic; caption: string; stylePrompt: string }): Promise<PosterHtmlResponse>`
- `generateWeChatCardThumbnailHtml(args: { pr: PartnerRequestPublic; stylePrompt: string }): Promise<PosterHtmlResponse>`

Implementation details:

- Use `generateObject` with `posterHtmlResponseSchema`.
- System prompt comes from config (3 variants), selected by styleIndex (wraparound).
- XHS prompt must include the provided caption as the only text content source.
- WeChat prompt must select `keyText` (≤3 chars OR 1 emoji) and embed it into HTML.

### A4) Config keys

Use `ConfigService.getJsonArrayOrFallback`:

- `share.xiaohongshu_poster_html_style_prompts`
- `share.wechat_card_thumbnail_html_style_prompts`

Provide safe defaults (3 prompts each) in code.

### A5) Wire routes

Update `src/index.ts`:

- `.route('/api/share', shareRoute)`

(Keep existing `/api/llm/xiaohongshu-caption` unchanged.)

## B. Frontend changes (apps/frontend)

### B1) Add HTML renderer: `src/composables/renderHtmlPoster.ts` (or `useRenderHtmlPoster.ts`)

Exports:

- `renderPosterHtmlToBlob(input: { html: string; width: number; height: number; backgroundColor?: string; scale: number }): Promise<Blob>`

Implementation details:

- Create hidden iframe with:
  - `sandbox="allow-same-origin"`
  - fixed viewport size
- Inject CSP into `srcdoc`.
- Deny-list validation before `srcdoc` assignment.
- Wait for iframe `load`, then best-effort `fonts.ready`.
- Find `#poster-root`; throw if missing.
- Call `html2canvas` with explicit `width/height/scale`.

### B2) Add queries

Add:

- `src/queries/useGenerateXhsPosterHtml.ts`
  - calls `client.api.share.xiaohongshu["poster-html"].$post({ json: { prId, caption, style } })`
- `src/queries/useGenerateWechatThumbHtml.ts`
  - calls `client.api.share["wechat-card"]["thumbnail-html"].$post({ json: { prId, style } })`

(Use the same pattern as `useGenerateXiaohongshuCaption.ts`.)

### B3) Plumb `prId` through UI

Update component props:

- `SharePR.vue` already receives `shareUrl` + `prData` (parsed/rawText). Extend to include `prId`.
- Update:
  - `ShareToXiaohongshuProps` to include `prId`
  - `ShareToWechatChatProps` to include `prId`

### B4) Update Xiaohongshu share component

File: `src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue`
Change poster generation pipeline:

1) Caption generation stays: `/api/llm/xiaohongshu-caption`.
2) Generate poster HTML via `useGenerateXhsPosterHtml` using `{ prId, caption, styleIndex }`.
3) Render to Blob via `renderPosterHtmlToBlob`.
4) If in WeChat browser: upload via `useCloudStorage.uploadFile` and use returned URL.
5) Else: use `blob:` URL.
6) Fallback: on any failure → call existing `useGeneratePoster(caption, styleIndex)`.

### B5) Update WeChat share component

File: `src/components/ShareToWechatChat/ShareToWechatChat.vue`
Change thumbnail generation pipeline:

1) Init JS-SDK stays.
2) Generate thumbnail HTML via `useGenerateWechatThumbHtml` using `{ prId, styleIndex }`.
3) Render to Blob via `renderPosterHtmlToBlob` (1:1 dimensions).
4) Upload Blob via `useCloudStorage.uploadFile` to obtain URL.
5) Call `setWeChatShareCard({ ..., imgUrl })`.
6) Fallback: if HTML pipeline fails → generate a 1:1 template-based thumbnail.
   - Option A (preferred): add a tiny `WechatThumbTemplate.vue` + `useGenerateWechatThumbPoster.ts` using the existing html2canvas template approach.
   - Option B: refactor `useGeneratePoster` to accept dimensions/template.

### B6) Keep WeChat-browser upload behavior

- XHS poster: if `isWeChatBrowser()` always upload the resulting PNG and use the backend URL.
- WeChat share card: always upload (needed for `imgUrl`).

## C. Validation / Testing

### C1) Typecheck

- Run `pnpm --filter @partner-up-dev/backend lint` (or `pnpm -C apps/backend ...` depending on scripts)
- Run `pnpm --filter @partner-up-dev/frontend lint`
- Ensure no new `any` usage.

### C2) Smoke tests (manual)

1) Non-WeChat browser:

- XHS: generate caption, generate poster, download poster works.

2) WeChat browser:

- XHS: poster preview uses backend URL (not `blob:`).
- WeChat: share card uses uploaded URL and updates in JS-SDK.

### C3) Backend endpoint checks

- `POST /api/share/xiaohongshu/poster-html` with invalid schema → 400.
- `POST /api/share/...` with missing PR → 404.

## D. Documentation

- Update `apps/backend/AGENTS.md` and/or `apps/frontend/AGENTS.md` if any share/poster workflow notes become outdated.
- Write `docs/task/llm-html-iframe-poster-refactor/RESULT.md` after implementation.
