# Admin Two-Column Shell Correction

## Objective & Hypothesis

- Objective: Correct the Admin shell contract after review of the PR and Anchor Event management layouts.
- Hypothesis: Admin pages should share a two-column operator workspace. The left column should combine global Admin navigation with route-context modules that are reused across second-level views. The right workspace should contain the page header and active business section content.

## Guardrails Touched

- Typed input: `Constraint` + `Reality`
- Active mode: `Solidify` -> `Execute`
- Durable owner:
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `apps/frontend/src/domains/admin/ui/layout/AdminPageScaffold.vue`
  - Admin route pages under `apps/frontend/src/pages`
  - Admin PR views under `apps/frontend/src/domains/admin/ui/pr/views`
- Blast radius:
  - Admin page shell width consistency
  - placement of route-context modules
  - Anchor Event page scaffold migration
  - PR, support-resource, POI, and feedback questionnaire shell behavior through the shared scaffold

## Decision

Admin shell layout has two visible columns at desktop and medium widths:

- Left operator column:
  - fixed width `320px`
  - global `AdminNavigationPanel`
  - route-context modules shared across second-level views within the same top-level Admin area
  - examples: Anchor Event selection, PR filters, POI selection, support-resource selectors and stats, feedback questionnaire template selection
  - viewport-bounded vertical scrolling
- Right workspace:
  - page header
  - active second-level business section content
  - section orchestrators use `BentoLayout` and place business components into cards

The existing `#rail` slot remains the migration API for route-context modules. Its semantic owner is the left operator column.

## Correction From Earlier Slice Notes

Earlier scaffold notes treated route context as a separate wide-desktop rail beside the main workspace. That matched the first pilot implementation, then became inconsistent with the intended Admin IA once PR filters and Anchor Event selection were reviewed together. The current contract makes the context module part of the left column so PR management and Anchor Event management use the same shell width and placement model.

## Implementation Slice

1. Update task packet and durable docs with the two-column shell contract.
2. Change `AdminPageScaffold` so `#navigation` and `#rail` render in the same left column.
3. Migrate `AdminAnchorEventPage.vue` from `DesktopPageScaffold` to `AdminPageScaffold`.
4. Keep existing section orchestrators, business components, query hooks, and mutation hooks unchanged unless the scaffold migration requires a local template adjustment.
5. Verify PR management, Anchor Event management, support-resource, POI, and feedback questionnaire pages still render with the shared shell.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development`
- `git diff --check`
- Browser checks:
  - `/admin/pr#pr-basic`
  - `/admin/pr#pr-messages`
  - `/admin/anchor-events#anchor-event-basic`
  - `/admin/feedback-questionnaires`
  - medium width around `960px`
  - desktop width around `1280px`

## Implementation Notes

- `AdminPageScaffold.vue` now renders `#navigation` and `#rail` in one left operator column.
- The left operator column is sticky and viewport-bounded at medium / desktop widths.
- The right workspace now contains only the header and main slot.
- `AdminAnchorEventPage.vue` now uses `AdminPageScaffold` and places the Anchor Event selector inside the `#rail` migration slot.
- Existing PR, support-resource, POI, and feedback questionnaire pages receive the corrected placement through the shared scaffold.

## Verification Results

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed with no findings outside baseline.
- `pnpm --filter @partner-up-dev/frontend exec vite build --mode development`: passed.
- `git diff --check`: passed.
- Real browser checks after local Admin login:
  - `/admin/pr#pr-basic` at `1280px`: left column `320px`, workspace `896px`.
  - `/admin/anchor-events#anchor-event-basic` at `1280px`: left column `320px`, workspace `896px`.
  - `/admin/pr#pr-basic` at `960px`: left column `320px`, workspace `576px`.
  - `/admin/anchor-events#anchor-event-basic` at `960px`: left column `320px`, workspace `576px`.
  - `/admin/pr#pr-messages` at `960px`: left column `320px`, workspace `576px`; only `PR 留言` is active in the second-level navigation.
