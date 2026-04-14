# Task Packet - Anchor Event Footer Reveal Scaffold

## MVT Core

- Objective & Hypothesis: rename the existing home/support footers into common-footer roles and add a page scaffold where `header + content` occupies one viewport before the footer reveals on further page scroll. Hypothesis: a dedicated footer-reveal scaffold can give `AnchorEventPage` the requested page rhythm without changing the card stage's own overflow, drag, or projection behavior.
- Guardrails Touched:
  - `apps/frontend/src/domains/landing/ui/sections/FullCommonFooter.vue`
  - `apps/frontend/src/domains/support/ui/sections/MiniumCommonFooter.vue`
  - `apps/frontend/src/shared/ui/layout/FooterRevealPageScaffold.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - shared UI component guidance in `apps/frontend/src/AGENTS.components.md`
  - shared UI operating guidance in `apps/frontend/src/shared/ui/AGENTS.md`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - verify `AnchorEventPage` card mode still uses page scroll rather than an inner scroll container
  - verify the footer is below the first viewport and only appears after further page scroll

## Impact Handshake

- Address and Object:
  - rename footer component files and imports used by landing and shared page-level support surfaces
  - add one new shared layout scaffold for footer-reveal pages
  - recompose `AnchorEventPage` into `header` / `content` / `footer` slots without changing event-domain card/list business logic
- State Diff:
  - from a landing-only footer plus support footer naming, and an `AnchorEventPage` that flows directly inside `PageScaffold`
  - to explicit `FullCommonFooter` / `MiniumCommonFooter` roles, plus an `AnchorEventPage` assembled by a dedicated footer-reveal scaffold
- Blast Radius Forecast:
  - pages importing the existing support footer component
  - shared UI layout guidance docs
  - `AnchorEventPage` height behavior, especially card mode flex sizing
- Invariants Check:
  - do not change `AnchorEventCardModeSection` drag semantics, projection visuals, or pointer interaction ownership
  - do not change `FullScreenPageScaffold` behavior used by the messages page
  - do not convert `AnchorEventPage` content into an inner scroll container

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed with existing baseline debt: `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - token-governance returned to the repo's existing 42 findings outside baseline after replacing the renamed footer's hardcoded mobile link padding with `var(--sys-spacing-xs)`
- Browser verified on local Vite dev server `http://localhost:4002/events/2`:
  - list mode renders without footer visible in the first viewport
  - scrolling down reveals `MiniumCommonFooter`
  - card mode renders the active demand card, action row, and footer reveal without adding an inner content scroll container
- Browser verified `http://localhost:4002/` full-page screenshot still includes the renamed `FullCommonFooter` content.

## Follow-up 2026-04-14: First-Screen Height Correction

- Objective & Hypothesis: correct the first-screen height math after observing that `AnchorEventPage` card mode was partially clipped even though the footer remained below the fold. Hypothesis: the new scaffold was counting `var(--pu-vh)` inside a `PageScaffold` that already contributes top/bottom shell padding, so the viewport segment needs to use the shell's inner available height rather than the raw viewport height.
- Guardrails Touched:
  - `apps/frontend/src/shared/ui/layout/FooterRevealPageScaffold.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
- Verification:
  - browser inspection on local `http://localhost:4001/events/2?mode=card`
  - confirm `FullCommonFooter` is used on `AnchorEventPage`
  - confirm the first screen ends exactly at the CTA row instead of clipping the bottom edge
- Verification Outcome:
  - `FooterRevealPageScaffold` now subtracts the `PageScaffold` top shell inset from the first-screen segment: `var(--pu-vh) - var(--sys-spacing-med) - var(--pu-safe-top)`
  - browser measurement on `http://localhost:4001/events/2?mode=card` shows:
    - `window.innerHeight = 844`
    - `.footer-reveal-page-scaffold__viewport.bottom = 844`
    - `.card-mode__actions.bottom = 844`
    - `.home-section--footer.top = 844`
  - `AnchorEventPage` footer now uses `FullCommonFooter`

## Follow-up 2026-04-14: Full-Bleed Footer Shell

- Objective & Hypothesis: let `AnchorEventPage` keep its content-region inset while allowing `FullCommonFooter` to render full bleed. Hypothesis: `PageScaffold` should expose overridable shell padding, and `FooterRevealPageScaffold` should own the inset for header/content while leaving the footer region unconstrained.
- Guardrails Touched:
  - `apps/frontend/src/styles/_recipes.scss`
  - `apps/frontend/src/shared/ui/layout/PageScaffold.vue`
  - `apps/frontend/src/shared/ui/layout/FooterRevealPageScaffold.vue`
  - `apps/frontend/src/domains/landing/ui/sections/FullCommonFooter.vue`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - browser inspection on local `http://localhost:4001/events/2?mode=card`
- Verification Outcome:
  - `pu-page-shell` now supports `--pu-page-padding-*` overrides instead of hardcoding all shell insets
  - `FooterRevealPageScaffold` now disables outer `PageScaffold` padding/max-width, reapplies inset and max-width to the first-screen viewport only, and passes footer inset vars to `FullCommonFooter`
  - browser measurement on `http://localhost:4001/events/2?mode=card` shows:
    - `.page-scaffold.width = 390`
    - `.footer-reveal-page-scaffold__viewport.width = 390`
    - `.footer-reveal-page-scaffold__footer.width = 390`
    - `.home-section--footer.width = 390`
    - computed footer inner paddings remain `18px` on both sides
  - token governance remains at the existing 42 findings outside baseline
