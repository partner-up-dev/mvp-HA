# AGENTS.md for Frontend Styles

Use `src/styles/TOKEN-GOVERNANCE.md` as the source of truth for styling decisions.

## Layer Order

1. `ref`
2. `sys`
3. `dcs`
4. recipes
5. optional component contracts

Each design decision must have one owner. Do not recreate the same decision lower in the tree for convenience.

## Default Rule

Use direct `sys` tokens first.

If an existing `sys` token is already a good semantic fit and using it would not cause a severe visual regression:

- use the `sys` token directly
- do not add a `dcs` token
- do not add a recipe

## When `dcs` Is Allowed

Add `dcs` only when the governed output itself needs central ownership.

Typical cases:

- fluid layout or spacing outputs
- page-level max widths and bounded measures
- adaptive rules that must stay consistent across several consumers
- a decision that cannot be represented cleanly by existing `sys`

Do not use `dcs` as a naming layer for ordinary spacing, radius, or size tokens that already exist in `sys`.

## When Recipes Are Allowed

Recipes are for:

- governed logic
- stable shared treatments that need multiple coordinated properties

Examples:

- safe-area-aware page shell logic
- a shared surface treatment with border, background, and radius working together
- a stable interaction treatment with shared sizing, border, and state behavior

Non-examples:

- `gap: var(--sys-spacing-med)`
- one standard button padding block
- a single radius assignment

## Local Consumer Rules

Components, domain UI, pages, and sections may:

- consume `sys`, `dcs`, and approved recipes
- create local aliases to governed values
- compose governed values structurally

They may not:

- invent new reusable design values locally
- add new fluid curves locally
- add new tint math locally
- create private token namespaces to justify one-off values

## Current Shared Treatments

Use existing recipes before inventing another one:

- `pu-page-shell`
- `pu-surface-panel(...)`
- `pu-surface-card(...)`
- `pu-pill-action(...)`
- `pu-selection-card(...)`
- `pu-field-shell(...)`
- `pu-form-control(...)`
- `pu-rect-action(...)`

If none fits, decide whether the need is:

- direct `sys`
- real `dcs`
- a real shared treatment

Only then add a new abstraction.

## Guardrail Command

Use:

- `pnpm --filter @partner-up-dev/frontend lint:tokens`

Strict mode exists for enforcement work:

- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

The current setup is baseline-backed. New findings outside the accepted baseline should be treated as regressions.
