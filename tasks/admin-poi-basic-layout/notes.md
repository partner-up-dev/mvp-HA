# Admin POI Basic Layout

## Objective & Hypothesis

Optimize `/admin/pois#poi-basic` by moving POI create/save actions to the page header and regrouping POI basic cards by operator workflow.

Hypothesis: this is a frontend-only layout reshuffle. Existing `useAdminPoiManagementWorkspace` state and mutation handlers can remain the source of truth.

## Guardrails Touched

- Frontend Admin POI basic section.
- Page header action placement.
- Existing POI selection, create, save, gallery, availability-rule, and meeting-point data flow should remain unchanged.

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
