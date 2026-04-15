# Task Packet - Anchor Event List Date Aggregation

## MVT Core

- Objective & Hypothesis: change Anchor Event Page list mode so tabs aggregate batches by product-local date instead of per batch start datetime. Hypothesis: the existing event-detail payload already contains enough batch time-window data to group tabs locally on the frontend while preserving batch-scoped PR browsing and create flow inside the selected date panel.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` Anchor Event browsing and controlled create flow
  - frontend event-domain ownership for Anchor Event list-mode behavior
  - batch-scoped create semantics must remain intact even when the list tab groups by date
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Follow-up Slice: Date-Level Empty State

- Objective & Hypothesis: Fix list-mode date aggregation empty-state behavior so a selected date with at least one visible Anchor PR never shows a contradictory empty batch message. Hypothesis: the tab is already date-scoped, so the render list should flatten visible PRs across the selected date's batches and evaluate empty state once at the date level while preserving each card's batch time label.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventListModeSection.vue`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
  - List-mode create flow must remain batch-scoped.
- Planned Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Code inspection confirms list mode now flattens visible PRs across the selected date's batches before rendering, and the empty state is evaluated once at the date level.

## Follow-up Slice: PR Card Meta Time

- Objective & Hypothesis: Move the list-mode Anchor PR card start-time label into the card meta row so it uses the same presentation pattern as location and participant count. Hypothesis: the flattened date-level list still supplies the batch-specific `timeLabel`, so this is a primitive presentation change only.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventPRCard.vue`
- Planned Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Code inspection confirms the list-mode Anchor PR card now renders `timeLabel` in the meta row alongside location and participant count, using the same meta-row typography and spacing.
