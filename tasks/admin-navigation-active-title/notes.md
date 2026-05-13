# Admin Navigation Active Title

## Objective & Hypothesis

Move admin section identity from the content header into the navigation panel. The navigation panel should show the currently selected nav item's title and subtitle, while page-level actions remain available outside the removed content title block.

## Guardrails Touched

- Frontend admin navigation model and panel rendering.
- Admin page scaffold action placement.
- Admin route entry pages that previously supplied content title headers.
- zh-CN locale schema and copy.

## Verification

- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed: `pnpm --filter @partner-up-dev/frontend build`.
- Passed: local browser visual smoke check for `/admin/pois#poi-basic` and `/admin/analytics`.
