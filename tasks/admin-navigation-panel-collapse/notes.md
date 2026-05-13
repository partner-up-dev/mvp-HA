# Admin Navigation Panel Collapse

## Objective & Hypothesis

Make the Admin navigation card itself non-scrollable while keeping the left Admin column independently scrollable from the right workspace.

Hypothesis: the scroll affordance currently comes from both `AdminNavigationPanel.vue` and `AdminPageScaffold.vue`; removing only the panel's internal scroll preserves the desired left-column behavior.

## Guardrails Touched

- Frontend Admin shared shell and navigation.
- `AdminPageScaffold.vue` left-column scroll behavior remains unchanged.
- Shared navigation must continue filtering entries by admin roles and highlighting the active route / hash.

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- Browser visual check was attempted through normal Admin login. Local backend `POST /api/auth/admin/login` returned HTTP 500 with an empty response body, so the Admin workspace could not be reached in browser during this slice.
- Diff inspection confirmed `AdminPageScaffold.vue` left-column scroll behavior was left unchanged; only the navigation panel owns the new collapse state and removed internal scroll.
