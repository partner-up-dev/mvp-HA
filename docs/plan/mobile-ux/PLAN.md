# Mobile UX Optimization Plan

Date: 2026-01-27

## Goal

Make the app feel “native-mobile” for thumb usage: stable viewport height, comfortable spacing, large tap targets, predictable modal behavior, and resilient text/layout on small screens.

## Non-goals

- No new features (accounts, push, etc.).
- No backend/API changes.
- No major rebrand or design system rewrite.

## Current Observations (From Repo)

- Mobile-first container layout exists (`max-width: 480px`), but many screens use `min-height: 100vh`, which is unreliable on iOS Safari (address bar + keyboard).
- PR page action buttons are a single flex row; on narrow screens this can compress tap targets or overflow.
- Several icon buttons are below recommended tap size (44px): back button, PIN regenerate (32px), tag remove (16px), toast close.
- Modal behavior is inconsistent:
  - `EditContentModal` has `max-height: 90vh` and `overflow-y: auto`.
  - PR status modal lacks scroll constraints and can run off-screen on short devices / with keyboard.
  - No background scroll lock while a modal is open.
- Safe-area is not handled (`viewport-fit=cover` missing; no `env(safe-area-inset-*)` padding).
- Share flow: if `navigator.share()` throws, no fallback/feedback.
- Router has no `scrollBehavior`, so navigation may preserve scroll unexpectedly.

## Proposed Approach (Mobile-first)

Focus on “small screen defaults” and progressively enhance for larger screens using existing SCSS breakpoint mixin (`@include mx.breakpoint(md)` etc.).

### A) Stable Viewport Height + Safe Area

1. Update [apps/frontend/index.html](apps/frontend/index.html) viewport meta to include `viewport-fit=cover`.
2. Add global CSS utilities (likely in [apps/frontend/src/styles/index.scss](apps/frontend/src/styles/index.scss) and/or [apps/frontend/src/App.vue](apps/frontend/src/App.vue)):
   - Prefer `min-height: 100dvh` (with fallback) over `100vh`.
   - Add safe-area padding helpers using `env(safe-area-inset-*)` for page containers and fixed overlays.

### B) Action Layout on PR Page

- Change PR page `.actions` from a single horizontal row to a mobile-friendly layout:
  - Mobile default: vertical stack.
  - Larger screens: switch to row layout via breakpoint mixin.

### C) Minimum Tap Targets (44px)

- Ensure interactive elements meet ~44px minimum hit area:
  - Back/home button in PR page.
  - PIN regenerate icon button.
  - Tag remove “×” button.
  - Toast close button.
- Use existing token sizes: `--sys-size-large` is 44px (from ref tokens).

### D) Modal Behavior Consistency

- Unify modal constraints:
  - Apply `max-height` + `overflow-y: auto` to the PR status modal.
  - Use `dvh` (or safe `svh`) for heights where possible.
  - Add `-webkit-overflow-scrolling: touch`.
- Add scroll lock when any modal is open (simple composable / utility that toggles `document.body.style.overflow`).
- Optional accessibility hardening (low effort): `role="dialog"`, `aria-modal="true"`, focus initial input.

### E) Share Flow Feedback

- If `navigator.share()` throws (cancel or unsupported behavior), fall back to clipboard write.
- Provide user-visible feedback inline (reuse existing `ErrorToast` pattern where appropriate, or keep lightweight “copied” label on the button).

### F) Text Overflow Resilience

- Clamp PR title to 1–2 lines.
- Add `overflow-wrap:anywhere` / `word-break: break-word` for long values (scenario/location/notes/rawText).

### G) Navigation Polish

- Add router `scrollBehavior` to scroll to top on page navigation.

## Target Files (Expected)

- [apps/frontend/index.html](apps/frontend/index.html)
- [apps/frontend/src/App.vue](apps/frontend/src/App.vue)
- [apps/frontend/src/styles/index.scss](apps/frontend/src/styles/index.scss)
- [apps/frontend/src/pages/HomePage.vue](apps/frontend/src/pages/HomePage.vue)
- [apps/frontend/src/pages/PRPage.vue](apps/frontend/src/pages/PRPage.vue)
- [apps/frontend/src/components/PINInput.vue](apps/frontend/src/components/PINInput.vue)
- [apps/frontend/src/components/EditContentModal.vue](apps/frontend/src/components/EditContentModal.vue)
- [apps/frontend/src/components/ErrorToast.vue](apps/frontend/src/components/ErrorToast.vue)
- [apps/frontend/src/components/ShareButton.vue](apps/frontend/src/components/ShareButton.vue)
- [apps/frontend/src/components/PRCard.vue](apps/frontend/src/components/PRCard.vue)
- [apps/frontend/src/router/index.ts](apps/frontend/src/router/index.ts)

## Acceptance Criteria (Manual)

- iOS Safari: opening keyboard in textarea/input does not clip content; page height feels stable.
- PR page actions never overflow horizontally; all actions remain easily tappable.
- Key interactive elements have comfortable hit areas (≈44px).
- Modals are scrollable on short screens, don’t trap content off-screen, and do not allow background scroll.
- On iPhone with home indicator: bottom content/overlays are not cramped (safe-area padding).
- Share button provides feedback (share or copy).
- Navigation between pages resets scroll to top.

## Decisions

- PR page actions use a vertical stack on mobile.
- Feedback stays inline (keep current `ErrorToast` pattern; avoid introducing a new global toast system).
