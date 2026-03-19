# Token Governance

## Purpose

This frontend uses a governed styling stack:

1. `ref`
2. `sys`
3. `dcs`
4. recipes
5. optional component contracts

The goal is to keep design decisions auditable and centrally owned instead of being reinvented in pages, sections, and components.

## Core Rule

Use direct `sys` tokens first.

If an existing `sys` token already expresses the needed semantic well enough and using it would not cause a severe visual regression, consume that `sys` token directly.

Do not add `dcs` or a recipe just to wrap:

- one spacing token
- one size token
- one radius token
- one obvious semantic color token
- a trivial composition of existing `sys` values

## Layer Responsibilities

### `ref`

Owns raw primitives only.

Examples:

- palette ramps
- spacing scale
- radius scale
- typography primitives

`ref` does not own semantic meaning.

### `sys`

Owns app-wide semantic roles.

Examples:

- `--sys-color-primary`
- `--sys-color-surface-container`
- `--sys-spacing-med`
- `--sys-radius-sm`

`sys` is the default consumption layer.

### `dcs`

Owns governed outputs that need central naming beyond global system semantics.

Examples:

- fluid landing spacing outputs
- page-level max widths
- bounded content measures
- adaptive page hero typography

`dcs` should be narrow. It is not a second general-purpose token scale.

### Recipes

Own governed logic and stable shared treatments.

Examples:

- safe-area-aware page shell logic
- shared panel/card treatments
- shared interaction treatments
- shared form-control shells

Recipes may depend on tokens, but should not become a parallel variable-emission layer unless that is intentional.

### Component Contracts

Component-level contracts are optional and narrow.

They are allowed only for reusable primitive/base components with stable, exposed variants.

## Decision Tests

Before adding a new styling abstraction, ask in this order:

1. Can direct `sys` solve it without a severe visual regression?
2. If not, is the missing thing a governed output?
3. If not, is it governed logic or a stable shared treatment?
4. If not, it is probably local structural composition and should stay local.

## What Belongs Local

Local consumers may:

- compose governed values into layout
- alias governed values for readability
- choose among approved variants
- use intrinsic CSS mechanics for content/layout behavior

Examples:

- `grid-template-columns: minmax(0, 1fr) auto`
- `width: fit-content`
- `margin: 0`
- `padding: 0`
- local layout composition using existing `sys` and approved recipes

## What Must Not Be Invented Locally

Pages, sections, and ordinary components must not invent:

- new fluid spacing/type curves
- new tint percentages for reusable visual behavior
- new shared interaction geometry
- new safe-area formulas
- private token layers that hide one-off values

## Theme and State

Theme and state are axes of existing decisions, not excuses for local reinvention.

If a reusable treatment changes by hover, active, selected, focus, disabled, or theme:

- prefer `sys` if a global semantic already exists
- otherwise encode it in `dcs` or in a stable recipe

Do not let each consumer invent its own selected/hover tint math.

## Current Practical Rule Set

Use direct `sys` for:

- typography when an existing semantic style fits
- spacing, radius, and size when existing semantics fit
- straightforward local layout composition

Use `dcs` for:

- landing adaptive measures
- page-level width and height bounds
- other outputs that truly need centralized naming

Use recipes for:

- `pu-page-shell`
- `pu-surface-panel(...)`
- `pu-surface-card(...)`
- `pu-pill-action(...)`
- `pu-selection-card(...)`
- `pu-field-shell(...)`
- `pu-form-control(...)`
- `pu-rect-action(...)`

Do not add a new recipe if an existing recipe plus direct `sys` already solves the problem.

## Escalation Path

If styling work reveals a token gap:

1. check `sys`
2. check existing recipes
3. check whether the need is truly a governed output
4. only then add `dcs` or a new recipe

If the need is local and non-reusable, keep it local.
