# LLM-Generated HTML Posters — Implementation Result

## Summary

- Replaced client-side html2canvas posters with a server-rendered HTML → PNG pipeline powered by Puppeteer + Chromium.
- Added LLM-driven HTML generation with content-aware prompts and style mapping.
- Wired both Xiaohongshu sharing and WeChat share card thumbnails to the new API.

## Plan Revisions

- Standardized on **Puppeteer + @sparticuz/chromium** for rendering (instead of Playwright references in the original plan).
- Preserved existing 5 style indices and mapped them to new LLM style keys: `fresh`, `minimal`, `warm`, `modern`, `elegant`.
- Exposed a single `/api/poster/html` API that returns either a `data:` URL (default) or a persisted URL for WeChat.

## Backend Changes

### New Services

- `HtmlPosterService`
  - Generates HTML via LLM with content analysis and detailed prompts.
  - Ensures a valid HTML document and injects base sizing styles.
- `PuppeteerRenderService`
  - Renders HTML to PNG using shared Chromium instance.
  - High-DPI screenshot (deviceScaleFactor = 2) for crisp output.
- `PosterStorageService`
  - Persists rendered PNGs to the posters directory and provides download URLs.
  - Cleanup job removes stale posters (default: 7 days).

### New API

`POST /api/poster/html`

**Request**
```json
{
  "caption": "周末一起去公园散步吧🌿",
  "style": 0,
  "ratio": "3:4",
  "saveOnServer": false
}
```

**Response**
```json
{
  "posterUrl": "data:image/png;base64,...",
  "saved": false
}
```

If `saveOnServer` is `true` (or the request is detected as WeChat browser), the response becomes:
```json
{
  "posterUrl": "https://<host>/api/poster/download/<filename>.png",
  "saved": true
}
```

## Frontend Changes

- Introduced `useGenerateHtmlPoster` composable to call the new API.
- Updated **ShareToXiaohongshu** to display the server-rendered poster and handle both data URLs and remote URLs.
- Updated **ShareToWechatChat** to generate and use server-stored poster URLs for WeChat share card thumbnails.

## Operational Notes

- Poster cleanup runs every 24 hours; stale posters older than 7 days are removed.
- The existing upload endpoints remain untouched and can still be used elsewhere.
