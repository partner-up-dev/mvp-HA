# Task Packet - Anchor Event Demand Card Time Label

## MVT Core

- Objective & Hypothesis: Fix Anchor Event card-mode DemandCard time labels so the card carries its own date context, e.g. `今天(4月13日) 14:30`, while list mode keeps its date-tab-plus-time-row behavior. Hypothesis: the bug is frontend-owned because the backend demand-card projection returns raw `timeWindow`, and the frontend card view model currently formats only the start time.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/model/demand-cards.ts` owns card-mode demand-card view model projection.
  - `apps/frontend/src/pages/AnchorEventPage.vue` still owns list-mode batch date grouping and should not change list row semantics.
  - `GET /api/events/:eventId/demand-cards` remains a raw projection contract; backend should not emit localized labels for this fix.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Reality
- Active Mode: Diagnose -> Execute
- Evidence:
  - Card mode maps demand-card API rows through `toDemandCardViewModels(...)`.
  - `formatCardTimeLabel(...)` in `demand-cards.ts` formatted only `hour` and `minute`.
  - Backend demand-card service passes `batch.timeWindow` through unchanged and does not generate display labels.
- Planned Change:
  - Format card labels from `timeWindow[0]` as relative date first when applicable, followed by short date and start time.
  - Keep list-mode `formatBatchTimeLabel(...)` untouched.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Code inspection:
  - Card mode now formats demand-card labels as `今天(4月13日) 14:30` when the start date is product-local today.
  - List mode remains on the existing batch time-only label path.
  - Date-only starts no longer synthesize a fake `08:00` time in card mode.

## Follow-up Slice: Fixed Relative-Date Short Format

- Objective & Hypothesis: Make demand-card relative date parentheses use the fixed product short-date format `M.d` instead of the locale-driven `M/d`. Hypothesis: `Intl.DateTimeFormat` is the wrong primitive for this specific product string because the separator is part of the UI contract.
- Guardrails Touched:
  - `apps/frontend/src/domains/event/model/demand-cards.ts`
- Planned Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification Outcome:
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Code inspection confirms demand-card relative labels now use fixed `M.d` short dates, e.g. `今天(4.13) 14:30`.
