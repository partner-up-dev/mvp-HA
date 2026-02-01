# WeChat JS-SDK Share Card for PRPage — Result

## Date

2026-01-30

## Outcome

PRPage can now be shared as a WeChat “card” (title + description + thumbnail) when opened inside WeChat WebView and the user uses the WeChat menu share (“发送给朋友” / “分享到朋友圈”).

## What Changed

### Backend

- Added WeChat JS-SDK signature endpoint: `GET /api/wechat/jssdk-signature?url=...`
  - Computes SHA1 signature using cached `access_token` + `jsapi_ticket`.
  - Env vars:
    - `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
    - `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
- Made poster upload storage configurable / cross-platform:
  - `POSTERS_DIR` (optional)
  - Defaults to `/mnt/oss/posters` (Linux) or `./posters` (Windows)

### Frontend

- Loads WeChat JS-SDK script in `apps/frontend/index.html`.
- Added typed global `wx` declarations to avoid `any`.
- Added composable `useWeChatShare()`:
  - Initializes JS-SDK via backend signature API
  - Updates share data for both chat + timeline
  - Re-inits automatically if URL changes (SPA navigation)
- Added new share method component:
  - `ShareToWechatChat` (only shown in WeChat browser)
  - Reuses existing Xiaohongshu caption + poster generation, uploads poster, then uses it as `imgUrl` for WeChat card.
- Updated `SharePR` carousel to include “分享到微信” and mount only the active share method.
- Updated upload URL generation so returned download URLs are always absolute.

## Share Card Content Rules

- Title: `parsed.title` (fallback: “搭一搭 - PartnerUp”)
- Description: `rawText` (truncated)
- Thumbnail: generated poster image (uploaded, public URL)

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` ✅
- `pnpm --filter @partner-up-dev/frontend build` ✅
- `pnpm build` ✅

