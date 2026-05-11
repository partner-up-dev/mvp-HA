# Task Packet - Issue 171 Official Account Follow Guidance

- Objective & Hypothesis: guide users to follow the official account from Anchor Event entry surfaces and after successful PR join, while reducing repeated prompts through backend-confirmed follow state plus frontend cooldown. Hypothesis: one positive-only `users.wechat_official_account_followed_at` marker, a 6-hour follower-list sync job, and a shared 6-hour frontend prompt cooldown are enough for the MVP without adding a separate follower-state table.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` user-visible Anchor Event and join-success flow
  - `docs/20-product-tdd/system-state-and-authority.md` backend user-state ownership and frontend cooldown authority
  - `docs/20-product-tdd/cross-unit-contracts.md` WeChat follow-status API and background sync contract
  - Backend user entity, user repository, WeChat integration service, and JobRunner bootstrap
  - Frontend Anchor Event pages, PR join-success modal, shared WeChat follow UI, and local storage cooldown
- Verification:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - `pnpm --filter @partner-up-dev/backend db:lint`

## Impact Handshake

- Address and Object:
  - Product workflow text for Anchor Event browsing and join-success follow-up.
  - `users` table gains one nullable positive marker for confirmed official-account follow.
  - WeChat backend gains follower-list sync and follow-status read API.
  - Frontend gains shared official-account follow prompt orchestration.
- State Diff:
  - From: official-account follow guidance exists mainly on home/about and has no backend follow-state gate.
  - To: event entries and join-success flow can recommend follow, backend can suppress confirmed followers, frontend cooldown suppresses recent prompts until the next 6-hour sync opportunity.
- Blast Radius Forecast:
  - Backend build/runtime startup registers one additional recurring job.
  - Frontend route pages gain a new fixed snackbar or modal step.
  - Existing notification subscription prompt remains the first post-join step.
- Invariants Check:
  - PR join, notification subscription, WeChat OAuth, and subscription-message contracts keep their current semantics.
  - Follow-state sync only writes positive confirmations.
  - Existing user changes in Anchor Event list/date behavior stay intact.
- Verification:
  - Typecheck backend RPC surface.
  - Build frontend to verify Hono RPC inference and locale schema.
  - Token lint to catch new color/style governance issues.
  - DB lint to validate the new forward schema migration.

## Verification Result

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/backend db:lint` passed.
