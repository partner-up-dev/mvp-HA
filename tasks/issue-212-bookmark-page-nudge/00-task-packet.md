# Issue 212 Bookmark Page Nudge

## Objective & Hypothesis

- Replace automatic save-webpage-QR and official-account nudge entry surfaces on Home, Anchor Event Page, and Anchor Event Landing Page with one low-pressure bookmark-page nudge.
- Hypothesis: one shared 6-hour frontend cooldown across those three route surfaces gives enough revisit guidance without pushing QR or official-account actions.

## Guardrails Touched

- Product workflow truth for Anchor Event browsing revisit guidance.
- Frontend marketing/landing nudge UI and localStorage cooldown.
- Home, `/events/:eventId`, and `/e/:eventId` route assembly.
- PR join / waitlist success official-account follow prompt remains unchanged.

## Verification

- 2026-05-14: `pnpm --filter @partner-up-dev/frontend build` passed.
- 2026-05-14: `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- 2026-05-14: `pnpm test:unit:frontend` passed.

## Notes

- Confirmed with user: Home, Anchor Event Page, and Anchor Event Landing Page share a 6-hour cooldown.
- Confirmed with user: PR join / waitlist success official-account prompt stays as-is.
