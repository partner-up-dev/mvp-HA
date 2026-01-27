# Mobile UX Optimization Result

Date: 2026-01-27

## Summary

Implemented mobile-first interaction/content optimizations across the frontend:

- Safer viewport sizing (`dvh/svh` via CSS var) to reduce iOS Safari/keyboard `100vh` issues.
- Safe-area inset support for notched devices.
- PR page actions now stack vertically on mobile (no overflow).
- Increased tap targets to ~44px minimum for key icon/buttons.
- Modals are more resilient on short screens (scrollable + safe-area padding).
- Share flow now falls back to clipboard/prompt with inline button feedback.
- Router scroll resets to top on navigation.

## Changes

- apps/frontend/index.html
  - Added `viewport-fit=cover`.

- apps/frontend/src/styles/index.scss
  - Added `--pu-safe-*` vars and `--pu-vh` (100vh → 100svh → 100dvh when supported).

- apps/frontend/src/App.vue
  - `body` now uses `min-height: var(--pu-vh)` and disables tap highlight.

- apps/frontend/src/pages/HomePage.vue
  - Container uses safe-area aware padding and `min-height: var(--pu-vh)`.

- apps/frontend/src/pages/PRPage.vue
  - Container uses safe-area aware padding and `min-height: var(--pu-vh)`.
  - Actions area is vertical stacked by default; wraps to row on `md+`.
  - Back button hit-area upgraded to `--sys-size-large` (44px) with focus-visible outline.
  - Status modal is scrollable with dvh-based max-height and safe-area padding.
  - Added body scroll lock while any modal is open.

- apps/frontend/src/lib/body-scroll-lock.ts
  - New composable `useBodyScrollLock` to prevent background scrolling during modals.

- apps/frontend/src/components/PINInput.vue
  - PIN field + regenerate button height increased to `--sys-size-large`.

- apps/frontend/src/components/ErrorToast.vue
  - Close button hit-area increased to `--sys-size-large`.

- apps/frontend/src/components/EditContentModal.vue
  - Overlay + modal max-height are safe-area/dvh aware.
  - Tag remove button now meets `--sys-size-large` tap target.

- apps/frontend/src/components/ShareButton.vue
  - Robust share: try native share (with canShare when available), else clipboard, else prompt.
  - Inline state: “已复制!” / “分享失败”.

- apps/frontend/src/components/PRCard.vue
  - Long text wrapping hardened; raw text preserves newlines.

- apps/frontend/src/router/index.ts
  - Added `scrollBehavior` (restore on back/forward, otherwise scroll to top; supports hash).

## Verification

- Build/typecheck: `pnpm --filter @partner-up-dev/frontend build`

## Manual QA Checklist (Recommended)

- iOS Safari: open PR page, scroll, open Edit/Status modals; ensure background doesn’t scroll and modal content remains reachable when keyboard opens.
- iPhone with home indicator: ensure bottom padding feels comfortable (safe-area).
- Android Chrome: ensure actions stack vertically and buttons are easy to tap.
- Share: test both native share (mobile) and clipboard fallback (desktop).
