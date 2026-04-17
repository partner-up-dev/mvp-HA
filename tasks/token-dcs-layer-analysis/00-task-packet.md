# Token DCS Layer Analysis

## Objective & Hypothesis

Objective: Check whether the frontend `dcs` token layer is currently too broad or causing maintainability damage by bypassing `sys` tokens for minor visual differences.

Hypothesis: The current problem is mixed. The `dcs` map is not primarily a color/border bypass layer, but it contains some one-off or unused outputs that could move to direct `sys`, local composition, or recipes. The larger active bypass risk is consumer-local `color-mix`, `clamp`, and hardcoded spacing/radius reported by token governance.

## Guardrails Touched

- `apps/frontend/src/styles/TOKEN-GOVERNANCE.md`
- `apps/frontend/src/styles/AGENTS.md`
- `apps/frontend/src/styles/_dcs.scss`
- `apps/frontend/src/styles/_sys.scss`
- `apps/frontend/src/styles/_recipes.scss`
- `apps/frontend/src/styles/_mixins.scss`
- `apps/frontend/src/shared/ui/actions/Button.vue`
- `apps/frontend/src/domains/pr/ui/primitives/PRStatusBadge.vue`
- `apps/frontend/src/domains/pr/ui/primitives/PRRosterItem.vue`

## Verification

- Used literal search for `dcs`, `--dcs-*`, token governance, and styling bypass patterns.
- Ran `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Checked actual DCS definitions and consumers before forming the recommendation.
- After implementation, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed with no findings outside baseline.
- After implementation, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 2, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- After phase 2, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 2 backend response typing adjustment, `pnpm --filter @partner-up-dev/backend typecheck` passed.

## Findings

- `dcs` currently contains mostly layout, spacing, fluid typography, and one surface radius; it is not a large color/border token layer.
- There are unused or stale DCS entries such as bookmark nudge max width, anchor card stage/cover height, and anchor match badge size.
- Several DCS entries are single-use wrappers over ordinary page or component values, especially admin panel padding, support action max width, and page hero weight/line-height.
- The highest active governance debt is still consumer-local `color-mix`, local `clamp`, and hardcoded spacing/radius, not DCS color token proliferation.
- Recommended direction: prune stale DCS, migrate trivial single-use entries to direct `sys` or local composition, keep DCS only for shared governed adaptive outputs, and move repeated coordinated treatments into mixins/recipes.

## Implementation Slice

- Pruned stale or trivial DCS outputs:
  - `layout.panel-max-width`
  - `layout.support-actions-max-width`
  - `layout.bookmark-nudge-max-width`
  - `layout.anchor-card-stage-height`
  - `layout.anchor-card-cover-height`
  - `space.admin-panel-padding`
  - `space.anchor-card-content-padding`
  - `typography.page-hero-weight`
  - `typography.page-hero-line-height`
  - `typography.anchor-match-badge-size`
  - `surface.panel-radius-large`
- Replaced current token-lint consumer bypass findings with existing `sys` tokens or local composition based on `sys`.
- Did not extract HTML + styles into new components or recipes in this slice; that remains a separate design discussion.

## Phase 2 Implementation Slice

- Reused shared `Button` for local action button markup in:
  - `apps/frontend/src/pages/AnchorPRPage.vue`
  - `apps/frontend/src/shared/ui/sections/APRNotificationSubscriptions.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`
- Extended `PRStatusBadge` with small and pill variants, then replaced local PR status chip HTML/style in:
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventPRCard.vue`
  - `apps/frontend/src/domains/pr/ui/primitives/AnchorPRSearchResultCard.vue`
- Added `PRRosterItem` as a PR-domain primitive for shared roster identity/tag/state markup, with `plain` and `card` variants preserving the two existing contexts.
- Replaced duplicated roster item HTML/style in:
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRAwarenessLane.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`
- Narrowed `AnchorPRSummary.status` from `string` to `PRStatus` in the backend event-detail response type so frontend RPC consumers can reuse `PRStatusBadge` without a template cast.
- Confirmed the touched consumer files no longer contain direct `pu-rect-action` / `pu-pill-action` recipe includes or the removed local action/roster/status classes. Repo-wide recipe direct usage still exists in unrelated admin pages and older PR sections; those remain separate cleanup candidates.
