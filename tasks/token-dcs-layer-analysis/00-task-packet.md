# Token DCS Layer Analysis

## Objective & Hypothesis

Objective: Check whether the frontend `dcs` token layer is currently too broad or causing maintainability damage by bypassing `sys` tokens for minor visual differences.

Hypothesis: The current problem is mixed. The `dcs` map is not primarily a color/border bypass layer, but it contains some one-off or unused outputs that could move to direct `sys`, local composition, or recipes. The larger active bypass risk is consumer-local `color-mix`, `clamp`, and hardcoded spacing/radius reported by token governance.

## Guardrails Touched

- `apps/frontend/src/styles/AGENTS.md`
- `apps/frontend/scripts/check-token-governance.mjs`
- `apps/frontend/src/styles/_dcs.scss`
- `apps/frontend/src/styles/_sys.scss`
- `apps/frontend/src/styles/_recipes.scss`
- `apps/frontend/src/styles/_mixins.scss`
- `apps/frontend/src/shared/ui/actions/Button.vue`
- `apps/frontend/src/shared/ui/actions/ActionLink.vue`
- `apps/frontend/src/shared/ui/actions/FeedbackButton.vue`
- `apps/frontend/src/shared/ui/navigation/TabBar.vue`
- `apps/frontend/src/domains/support/ui/sections/SupportContactAction.vue`
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
- After phase 3, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- After phase 3, `git diff --check` passed.
- After phase 3, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 4, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- After phase 4, `git diff --check` passed.
- After phase 4, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 5, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- After phase 5, `git diff --check` passed.
- After phase 5, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 6, confirmed no remaining frontend references to `pu-*` recipe mixins or `_recipes`.
- After phase 6, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- After phase 6, `git diff --check` passed.
- After phase 6, `pnpm --filter @partner-up-dev/frontend build` passed.
- After phase 7, confirmed no active source/doc references to `TOKEN-GOVERNANCE.md` outside historical task notes.
- After phase 7, `git diff --check` passed.
- After phase 7, `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.

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

## Phase 3 Implementation Slice

- Extended shared `Chip` with a large size so legacy `pu-pill-badge` consumers can reuse the component without local badge treatment CSS.
- Replaced page/domain-local `pu-pill-badge` consumers with `Chip` in support, profile, and PR action-lane contexts.
- Replaced many pure `<button>` `pu-rect-action` / `pu-pill-action` consumers with shared `Button`, including admin flows, PR action sections, share UI controls, event card actions, and drawer/carousel controls.
- Adopted `SurfaceCard` for simple page-level card wrappers in community PR, OAuth callback, and anchor booking support flows.
- Left link-like actions, navigation treatments, statusful success/error controls, dashed/tertiary actions, and domain-internal card layouts in local recipes pending API or component-boundary discussion.
- Remaining direct recipe usage now mostly falls into:
  - shared primitive internals (`Button`, `SurfaceCard`)
  - link/navigation treatments
  - statusful copy/download controls
  - unsupported Button API variants (`tertiary`, `dashed`)
  - PR domain-internal card structures that may deserve componentization rather than direct `SurfaceCard` replacement

## Phase 4 Implementation Slice

- Added `ActionLink` as the shared action-looking link primitive for RouterLink and external anchor CTAs.
- Added `FeedbackButton` as the shared transient pending/success/error action primitive that composes `Button` and keeps state styling centralized.
- Added `SupportContactAction` in the support domain for the support-page mini-program QR fallback, composing `Button` or `ActionLink` without leaking that workflow into shared UI.
- Replaced remaining link/RouterLink action recipe consumers in event plaza and contact support with `ActionLink` or support-domain composition.
- Restored Landing Page action markup and visual treatment to component-local styles after confirming Landing is an explicit visual exception; the restored treatment does not call `pu-pill-action(...)` or move the style back into DCS/recipe.
- Replaced share copy/share success/error button treatments with `FeedbackButton`; download/regenerate/open-app actions now compose `Button`.
- Updated `TabBar` so it no longer includes `pu-pill-action(...)`; its tab buttons now own navigation-specific styles directly with `sys` tokens.
- Documented that `pu-pill-action(...)` and `pu-rect-action(...)` are restricted to lowest action primitives (`Button`, `ActionLink`) rather than pages, domain components, or higher-level shared components.
- Remaining direct action recipe usage is now limited to lowest action primitives plus previously deferred PR-specific unsupported variants (`tertiary`, `dashed`) in `AnchorAttendancePanel` and `PRForm`.

## Phase 5 Implementation Slice

- Moved Landing-only DCS values out of global `dcs` and into the Landing page boundary as `--landing-*` local CSS variables on `HomePage`.
- Updated Landing descendants to consume inherited `--landing-*` variables instead of global `--dcs-*` variables:
  - `LandingHeroSection`
  - `LandingValuePropsSection`
  - `FullCommonFooter`
- Removed Landing-only entries from `_dcs.scss`, including hero measures, section/panel/entry spacing, footer gap/copy measure, and expandable panel max height.
- Preserved the Landing visual values exactly; only ownership moved from global DCS to Landing-local style.
- Confirmed no remaining runtime references to removed `--dcs-space-*`, `--dcs-layout-landing-*`, or `--dcs-layout-expandable-*` variables.
- Updated token governance docs and checker so Landing visual boundaries may keep local `clamp()` / `color-mix()` formulas without weakening those rules for ordinary pages and components.

## Phase 6 Implementation Slice

- Removed the remaining global recipe layer by deleting `_recipes.scss` and the recipe forward from `_mixins.scss`.
- Inlined action treatment ownership into `Button` and `ActionLink`, adding `tertiary` and `dashed` tones so PR-specific consumers no longer include action recipes directly.
- Added `ChoiceCard` as the shared selectable card primitive and replaced previous `pu-selection-card(...)` usage in admin navigation, admin workspaces, PR status selection, and My PR lists.
- Moved reusable surface shell ownership into `SurfaceCard`; domain/page-specific card, panel, and field shells now use local `sys` composition instead of shared recipes.
- Inlined `PageScaffold` safe-area layout inside the scaffold primitive.
- Updated styling/component governance docs to describe the retired recipe layer and the current shared primitive/component-contract path.

## Phase 7 Documentation Slice

- Merged the separate token governance document into `apps/frontend/src/styles/AGENTS.md`.
- Deleted `apps/frontend/src/styles/TOKEN-GOVERNANCE.md` so styling rules have one frontend-local owner.
- Simplified the style rules around four decisions: use `sys` first, keep `dcs` narrow, extend shared primitives only for real component contracts, and keep Landing-only art direction local.
- Updated frontend/component documentation references to point at `src/styles/AGENTS.md`.
