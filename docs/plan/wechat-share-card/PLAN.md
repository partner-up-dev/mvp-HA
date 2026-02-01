# WeChat JS-SDK Share Card for PRPage

## Plan Date

2026-01-30

## Objective

When a user opens our website inside the WeChat in-app browser (WeChat WebView) and taps **“Share to Chat”** (右上角菜单 → 发送给朋友), the shared message should be a **rich card** (title + description + thumbnail), not a plain text link.

## Key Reality (How WeChat share cards work)

- For **“Share to Chat” inside WeChat WebView**, WeChat provides sharing customization via **WeChat JS-SDK**.
- Our frontend is a Vue SPA; customizing share content needs:
  - WeChat JS-SDK loaded in the page
  - `wx.config(...)` with a valid signature for the *current URL*
  - calling share APIs after `wx.ready` and after PR data loads
- Improving “paste a link into chat” previews is a different mechanism (crawler + OG tags) and is optional for this task.

## Observations from Current Codebase

- PR route: `apps/frontend/src/router/index.ts` → `/pr/:id`
- Page: `apps/frontend/src/pages/PRPage.vue`
  - already sets `og:*` tags via `useHead()` (client-only, not enough for crawler previews)
- Existing browser detection: `apps/frontend/src/lib/browser-detection.ts` has `isWeChatBrowser()`.
- Existing share carousel: `apps/frontend/src/components/SharePR.vue` currently supports `COPY_LINK` and `XIAOHONGSHU`.
- Existing poster pipeline (already WeChat-aware):
  - Caption generation: `apps/frontend/src/queries/useGenerateXiaohongshuCaption.ts`
  - Poster rendering: `apps/frontend/src/composables/useGeneratePoster.ts`
  - WeChat browser path uploads poster to backend: `apps/frontend/src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue` + `apps/frontend/src/composables/useCloudStorage.ts`
  - Backend endpoints: `POST /api/upload/poster` and `GET /api/upload/download/:key`
- Backend currently exposes only JSON APIs and an upload/download image route. No WeChat endpoints yet.

## Approach Options

### A) WeChat JS-SDK share customization (Selected)

- Pros: Directly meets the requirement (“Share to Chat” in WeChat WebView); fully controls title/desc/img/link.
- Cons: Needs Official Account setup (JS接口安全域名), plus backend signature endpoint; requires appId/appSecret and server-side token/ticket caching.

### B) Server-render OG meta for better “paste link” previews (Optional add-on)

- Pros: Makes pasted links show better previews in more platforms/crawlers.
- Cons: Not required for “Share to Chat” inside WeChat WebView.

## Selected Design (A)

### High-level Behavior

1. Frontend loads inside WeChat WebView.
2. Frontend detects WeChat (`isWeChatBrowser()`), then initializes JS-SDK:
   - Calls backend: `GET /api/wechat/jssdk-signature?url=<currentUrl>`
   - Backend returns `{ appId, timestamp, nonceStr, signature }`
   - Frontend calls `wx.config({ appId, timestamp, nonceStr, signature, jsApiList: [...] })`
3. After PR data loads on `PRPage`, frontend sets share data:
   - For “Share to Chat”: `wx.updateAppMessageShareData({ title, desc, link, imgUrl })`
   - For “Share to Moments” (optional): `wx.updateTimelineShareData({ title, link, imgUrl })`
4. User shares from WeChat menu: WeChat sends a rich card.

### Share Image Strategy

- Reuse the existing Xiaohongshu poster generation pipeline to produce a poster image and upload it (WeChat browser path already exists), then use the resulting **absolute** URL as `imgUrl` for the WeChat card.
- This keeps the WeChat card thumbnail consistent with the existing “Share to Xiaohongshu” visuals.

## Implementation Steps (Concrete)

### Backend (JS-SDK signature API)

1. Add env vars:
   - `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
   - `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
2. Add controller: `GET /api/wechat/jssdk-signature`
   - Input: `url` (string, required)
   - Output: `{ appId, timestamp, nonceStr, signature }`
3. Add `WeChatJssdkService`:
   - Fetch + cache `access_token` (expires ~7200s)
   - Fetch + cache `jsapi_ticket` (expires ~7200s)
   - Generate `nonceStr` + `timestamp`
   - Compute signature using SHA1 over canonical param string
4. Signature details:
   - Use `url` without `#...` fragment
   - Canonical string keys are lowercase: `jsapi_ticket`, `noncestr`, `timestamp`, `url`
   - Sorted by ASCII order and joined as `k=v&k=v...`
5. Error handling:
   - Missing env vars → 500 with clear error
   - Token/ticket fetch failure → 502/500 with clear error

### Frontend (init + set share data)

1. Load WeChat JS-SDK:
   - Preferred: add `<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>` to `apps/frontend/index.html`
2. Add `useWeChatShare()` composable:
   - `initWeChatSdk()`:
     - if not WeChat, no-op
     - request signature for `window.location.href.split('#')[0]`
     - call `wx.config(...)`
     - await `wx.ready` / handle `wx.error`
   - `setWeChatShareData({ title, desc, link, imgUrl })`:
     - only after sdk ready
     - call update share APIs (chat + timeline)
3. Add a new share method component `ShareToWechatChat`:
   - Location: `apps/frontend/src/components/ShareToWechatChat/*`
   - Shown only when `isWeChatBrowser()` is true.
   - Reuse existing caption+poster pipeline:
     - generate caption via `useGenerateXiaohongshuCaption`
     - generate poster via `useGeneratePoster`
     - upload poster via `useCloudStorage` to get a stable URL usable as `imgUrl`
   - Initialize WeChat JS-SDK (once) and call:
     - `wx.updateAppMessageShareData({ title, desc, link, imgUrl })`
     - `wx.updateTimelineShareData({ title, link, imgUrl })`
   - Provide UX:
     - poster preview + “更新分享卡片” button (or auto-update on data ready)
     - show WeChat-specific guidance: “点击右上角…发送给朋友/分享到朋友圈”
4. Integrate into `apps/frontend/src/components/SharePR.vue`:
   - Add method id: `WECHAT_CHAT`
   - Conditionally enable it: `enabled: isWeChatBrowser()`
   - Render `ShareToWechatChat` when selected

### Docs

1. Update root `AGENTS.md` “Current State” to mention WeChat JS-SDK share card support.
2. Update any relevant `apps/backend/AGENTS.md` / `apps/frontend/AGENTS.md` if new env vars or integration steps are added.

## Verification Plan

- Backend:
  - Hit `/api/wechat/jssdk-signature?url=...` and verify it returns stable fields
  - Verify caching prevents refetching token/ticket every request
- Frontend:
  - In WeChat WebView, confirm `wx.config` succeeds (`wx.ready` fires)
  - Tap WeChat menu → “发送给朋友”: card shows expected title/desc/img
  - (Optional) “分享到朋友圈”: shows expected title/img

## Open Questions for You

1. Confirm env var names you want to use (or accept the plan’s defaults):
   - `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
   - `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
2. In WeChat card copy, should `title/desc` come from PR fields (`parsed.title` / `parsed.scenario`) or from the generated caption?
