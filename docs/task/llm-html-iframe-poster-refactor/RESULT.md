# RESULT — LLM HTML + iframe/html2canvas poster refactor

## Outcome

- Implemented **LLM-generated HTML** posters rendered **client-side** via **sandboxed iframe + html2canvas** (no server-side headless browser).
- Added **two standalone share endpoints**:
  - `POST /api/share/xiaohongshu/poster-html` → 2:3 poster HTML (default 720×1080)
  - `POST /api/share/wechat-card/thumbnail-html` → 1:1 thumbnail HTML (default 300×300, simple ≤3 chars/emoji)
- Refactored Xiaohongshu caption generation to be **`prId`-based** (frontend no longer sends full PR data).
- Kept **template-based generation as fallback** when HTML generation/rendering fails.
- Ensured **WeChat in-app browser sharing uses uploaded URLs** (blob URLs are not shareable), keeping current behavior.

## Key Implementation Notes

### Backend

- New controller + service:
  - `apps/backend/src/controllers/share.controller.ts`
  - `apps/backend/src/services/ShareService.ts`
- New LLM methods and configurable style prompts:
  - `apps/backend/src/services/LLMService.ts`
  - Config keys:
    - `share.xiaohongshu_poster_html_style_prompts`
    - `share.wechat_card_thumbnail_html_style_prompts`
- Caption route updated:
  - `POST /api/llm/xiaohongshu-caption` now accepts `{ prId }`
  - Optional `style` is validated via query (`?style=0|1|2`)

### Frontend

- Core renderer:
  - `apps/frontend/src/composables/renderHtmlPoster.ts`
  - Uses deny-list validation + CSP injection + sandboxed iframe + html2canvas → PNG Blob
- New share HTML queries:
  - `apps/frontend/src/queries/useGenerateXhsPosterHtml.ts`
  - `apps/frontend/src/queries/useGenerateWechatThumbHtml.ts`
- Share flows updated:
  - Xiaohongshu: `apps/frontend/src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue`
  - WeChat: `apps/frontend/src/components/ShareToWechatChat/ShareToWechatChat.vue`
- Fallback WeChat thumbnail template:
  - `apps/frontend/src/components/WechatThumbTemplate.vue`
  - `apps/frontend/src/composables/useGenerateWechatThumbPoster.ts`

## How to Validate

- Backend typecheck:
  - `pnpm --filter @partner-up-dev/backend typecheck`
- Frontend build (includes `vue-tsc`):
  - `pnpm --filter @partner-up-dev/frontend build`

## Manual Smoke Test Checklist

- Non-WeChat browser:
  - XHS: generate caption → generate poster HTML → render → preview/download
  - WeChat thumbnail: generate thumbnail HTML → render → upload → preview URL
- WeChat in-app browser:
  - XHS poster: render → upload → ensure share uses uploaded URL
  - WeChat share card: always upload → `imgUrl` uses uploaded URL
- Failure paths:
  - Force LLM failure or invalid HTML → confirm fallback template generation works
