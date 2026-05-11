# Task Packet - Form Mode Advanced Toggle Extraction

## Objective & Hypothesis

- Extract the Form Mode advanced-mode toggle into a reusable UI primitive without changing time selection behavior.
- Hypothesis: keeping the boolean switch contract in `shared/ui/forms` and leaving event copy / workflow state in `FormModeTimeControl` gives reuse without moving domain meaning into shared UI.

## Guardrails Touched

- `apps/frontend/src/ARCHITECTURE.md`
- `apps/frontend/src/AGENTS.components.md`
- `apps/frontend/src/shared/ui/AGENTS.md`
- `apps/frontend/src/styles/AGENTS.md`
- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeTimeControl.vue`

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passes.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` completes and reports existing findings outside this extraction surface; no finding points at `ToggleSwitch.vue`.
