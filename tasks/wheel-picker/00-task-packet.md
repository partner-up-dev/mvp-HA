# WheelPicker Shared Primitive

## Objective & Hypothesis

Add a generic finite-boundary WheelPicker primitive for reusable vertical option selection.

Hypothesis: placing the picker under `apps/frontend/src/shared/ui/forms` gives domains a narrow, reusable control with iOS-style centered selection, pointer dragging, wheel input, keyboard movement, and snap-confirmed `v-model` updates.

## Guardrails Touched

- Input route: Artifact
- Mode: Execute
- Durable owner: `apps/frontend/src/shared/ui/forms`
- Documentation anchors: `apps/frontend/src/shared/ui/AGENTS.md`, `apps/frontend/src/AGENTS.components.md`
- Product behavior: unchanged
- Runtime deployment behavior: unchanged

## Verification

- Run frontend typecheck/build through `pnpm --filter @partner-up-dev/frontend build`.
- Run token governance through `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Review interaction contract against requested constraints: finite list, translucent center slot, snap-finished model updates, `surface|primary|secondary|tertiary` styling with `teritary` alias.

## Verification Results

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` completed successfully. Remaining findings are pre-existing files under landing/event form surfaces; `WheelPicker.vue` produced no token finding after replacing `color-mix()` with direct `sys` token usage.
- Interaction contract is implemented in `apps/frontend/src/shared/ui/forms/WheelPicker.vue`: finite clamped scroll range, translucent centered highlight, pointer drag, wheel input, click-to-center, keyboard movement, disabled option skipping, and delayed `update:modelValue` until snap completion.
