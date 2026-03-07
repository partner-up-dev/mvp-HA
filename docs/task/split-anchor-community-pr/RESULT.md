# Result

## Task
Split Anchor PR and Community PR into separate pages and subtype tables, while keeping the shared Partner mechanism and refactoring the PR frontend structure to reduce mixed semantics.

## Implemented

### Backend
- Added subtype entities and repositories:
  - `anchor_partner_requests`
  - `community_partner_requests`
- Added Drizzle migration:
  - `apps/backend/drizzle/0002_tough_molecule_man.sql`
- Split scenario read APIs:
  - `GET /api/cpr/:id`
  - `GET /api/apr/:id`
  - `GET /api/apr/:id/economy`
- Split scenario write APIs:
  - Community PR:
    - `POST /api/cpr`
    - `POST /api/cpr/natural_language`
    - `POST /api/cpr/:id/publish`
    - `PATCH /api/cpr/:id/content`
    - `PATCH /api/cpr/:id/status`
    - `POST /api/cpr/:id/join`
    - `POST /api/cpr/:id/exit`
  - Anchor PR:
    - `PATCH /api/apr/:id/content`
    - `PATCH /api/apr/:id/status`
    - `POST /api/apr/:id/join`
    - `POST /api/apr/:id/exit`
    - `POST /api/apr/:id/confirm`
    - `POST /api/apr/:id/check-in`
    - `GET /api/apr/:id/alternative-batches`
    - `POST /api/apr/:id/accept-alternative-batch`
    - `GET /api/apr/:id/reimbursement/status`
- Kept shared aggregate endpoints only where they are still truly shared:
  - `GET /api/pr/mine/created`
  - `GET /api/pr/mine/joined`
- Moved anchor-only behavior out of the generic PR surface:
  - confirm/check-in/reimbursement/alternative-batch actions now hang off the anchor domain/barrel
  - anchor-only schemas no longer live in the generic shared controller helper
- Fixed scenario rules:
  - Community PR only supports `join/exit`
  - Anchor PR owns confirmation window, confirm, and check-in
  - community join no longer gets blocked by the anchor `T-30min` rule
  - creator slot initialization no longer has hidden generic auto-confirm semantics
- Updated system-generated URLs to canonical scenario paths:
  - WeCom draft reply now links to `/cpr/:id`
  - reminder links now resolve to `/cpr/:id` or `/apr/:id`

### Frontend
- Replaced the generic PR pages with scenario pages:
  - `CommunityPRCreatePage.vue`
  - `CommunityPRPage.vue`
  - `AnchorPRPage.vue`
  - `AnchorPREconomyPage.vue`
- Canonical routes are now:
  - `/cpr/new`
  - `/cpr/:id`
  - `/apr/:id`
  - `/apr/:id/economy`
- Refactored PR frontend structure to separate page logic from presentational pieces:
  - split shared facts card from scenario action bars
  - split shared partner actions from anchor attendance actions
  - split community and anchor query hooks
  - added canonical route helpers under `src/entities/pr/routes.ts`
- Removed the old mixed generic surfaces:
  - `PRPage.vue`
  - `PRCreatePage.vue`
  - `PREconomyPage.vue`
  - generic mixed PR action/query files that encoded both scenarios together

### Documentation
- Updated product docs to reflect the scenario split, short routes, and anchor-only confirm/check-in rules:
  - `docs/product/overview.md`
  - `docs/product/glossary.md`
  - `docs/product/features/find-partner.md`
  - `docs/product/features/user-signin-signup.md`
  - `docs/product/features/wechat-login.md`
  - `docs/product/features/share-link.md`
  - `docs/product/features/share-to-wechat.md`
  - `docs/product/features/share-to-xhs.md`
  - `docs/product/features/wecom-message.md`
  - `docs/product/features/expire-partner-request.md`

## Verification Performed
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm build`
- `pnpm --filter @partner-up-dev/backend db:generate`

## Notes
- The migration file was generated, but `db:migrate` was not run against a live database in this task.
- Frontend production build still reports the existing Vite chunk-size warning for the vendor bundle; the build passes.
