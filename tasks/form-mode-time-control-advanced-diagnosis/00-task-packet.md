# Task Packet - Form Mode Time Control Advanced Diagnosis

## Objective & Hypothesis

- Diagnose whether Form Mode Time Control advanced mode needs an absolute time anchor to generate options for `/e/3`.
- Hypothesis: the empty advanced-mode wheel is caused by `earliestLeadMinutes: null`, because the frontend advanced generator uses that value as its finite horizon.

## Guardrails Touched

- `docs/10-prd/behavior/rules-and-invariants.md`
- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeTimeControl.vue`
- `apps/frontend/src/domains/event/model/form-mode.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts`
- `apps/backend/src/domains/anchor-event/services/time-window-pool.ts`
- `apps/backend/src/domains/anchor-event/services/form-mode.ts`

## Verification

- `GET http://localhost:4001/api/events/3/form-mode` returns `event.earliestLeadMinutes: null`, one absolute `startOptions` entry, and a default selection at `2026-05-06T06:00:00Z`.
- Code inspection shows `buildAdvancedModeStartOptions(null)` returns an empty array.
- Code inspection shows `FormModeTimeControl` switches the wheel source to the advanced array when advanced mode is enabled, so the date/time wheels become empty when the advanced array is empty.
