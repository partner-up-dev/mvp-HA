# Slice 6 - Admin Scaffold Stabilization

## Objective & Hypothesis

- Objective: move the feedback questionnaire and support-resource routes onto the same Admin operator shell.
- Hypothesis: once global navigation, route-local rail, and main workspace use the same scaffold, the remaining ownership work can focus on business boundaries instead of page layout drift.

## Guardrails Touched

- Typed input: `Constraint` + `Intent`
- Active mode: `Execute`
- Durable owner:
  - `apps/frontend/src/domains/admin/ui/layout/AdminPageScaffold.vue`
  - `apps/frontend/src/domains/admin/ui/layout/AdminRailPanel.vue`
  - `apps/frontend/src/pages/AdminFeedbackQuestionnairesPage.vue`
  - `apps/frontend/src/pages/AdminBookingSupportPage.vue`
  - `apps/frontend/src/pages/AdminBookingExecutionPage.vue`
- Blast radius:
  - Admin feedback questionnaire template page
  - Admin support resource configuration page
  - Admin support resource execution page

## Implementation Notes

- Added `AdminRailPanel` as the shared route-local rail container.
- Replaced the feedback questionnaire page-local rail card with `AdminRailPanel`.
- Migrated `AdminBookingSupportPage.vue` from `DesktopPageScaffold` to `AdminPageScaffold`.
- Migrated `AdminBookingExecutionPage.vue` from `DesktopPageScaffold` to `AdminPageScaffold`.
- Preserved existing query, mutation, draft, validation, and submit behavior in this slice.

## Ownership Status After Slice

- The three routes now share the same layout shell.
- `AdminBookingSupportPage.vue` still owns support-resource config query, draft rows, validation, and save command.
- `AdminBookingExecutionPage.vue` still owns support-resource execution query, search, per-PR drafts, submit command, and release command.
- These remaining owners are intentionally carried into Slice 8.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec tsc --noEmit`
  - passed
