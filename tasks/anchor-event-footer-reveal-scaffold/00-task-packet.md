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
