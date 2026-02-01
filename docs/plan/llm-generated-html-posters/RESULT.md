# LLM-Generated HTML Posters Result

## ✅ Summary

- Implemented server-side HTML poster generation using LLM prompts and Puppeteer rendering.
- Added poster storage service with shared upload/download paths for WeChat compatibility.
- Updated Xiaohongshu and WeChat sharing flows to use the new HTML poster API.
- Added client-side composable for generating/downloading HTML posters.

## 🔧 Backend Changes

- **New poster types + schema**: `apps/backend/src/lib/poster.ts`
  - Defines poster styles, ratios, and input schema for validation.
- **LLM poster generation**: `apps/backend/src/services/HtmlPosterService.ts`
  - Generates full HTML documents with inline CSS based on style prompts.
  - Includes lightweight content analysis to influence layout.
- **Rendering**: `apps/backend/src/services/PuppeteerRenderService.ts`
  - Uses `puppeteer-core` + `@sparticuz/chromium` for consistent PNG output.
- **Storage**: `apps/backend/src/services/PosterStorageService.ts`
  - Shared storage used by both upload/download and poster generation.
- **Poster API**: `apps/backend/src/controllers/poster.controller.ts`
  - `POST /api/poster/generate`
  - Returns base64 for non-WeChat browsers, server URL for WeChat or forced save.
- **Index wiring + cleanup**: `apps/backend/src/index.ts`
  - Route mounted at `/api/poster`.
  - Cleanup job + Puppeteer shutdown handler.

## 🎨 Frontend Changes

- **New composable**: `apps/frontend/src/composables/useGenerateHtmlPoster.ts`
  - Calls new backend endpoint and supports download for base64 or URLs.
- **Xiaohongshu sharing**: `apps/frontend/src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue`
  - Switched to HTML poster API, supports WeChat auto-save logic.
- **WeChat sharing card**: `apps/frontend/src/components/ShareToWechatChat/ShareToWechatChat.vue`
  - Uses server-saved poster URL as share card thumbnail.
- **Style mapping**: `apps/frontend/src/lib/poster-style-map.ts`
  - Maps caption style index to HTML poster styles.

## 🔁 Plan Revisions

- Poster API route implemented as `/api/poster/generate` (instead of `/generate-html-poster`) for cleaner RPC usage.
- Poster download URLs reuse existing `/api/upload/download/:key` endpoint.

## ⚠️ Notes

- `pnpm add` failed in the sandbox due to registry access restrictions (HTTP 403).
  - Dependencies were added to `apps/backend/package.json`, but `pnpm-lock.yaml` was not updated here.
