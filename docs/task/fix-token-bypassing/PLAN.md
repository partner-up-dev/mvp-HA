# PLAN - Fix Token Bypassing in `apps/frontend`

## 1. Problem Framing

The current frontend token system has a solid base (`ref` + `sys`) but it does not yet own enough design decisions. As a result, many styles still decide locally:

- how much to tint or mute a color
- how much padding an action should have
- how a section should scale across viewport sizes
- how safe-area offsets should participate in layout
- how typography and spacing should adapt across breakpoints

That is the core issue, not the existence of any specific CSS function. A healthy design system must distinguish:

- governed outputs: named design decisions that should be reused and audited
- governed logic: centralized recipes that compute those decisions
- structural composition: local assembly of already-governed decisions

The current codebase has plenty of structural composition, but it also contains too much local decision invention.

## 2. First-Principles Model

This plan follows three rules.

### Rule 0: Prefer Direct `sys` Consumption First

If a consumer can use an existing system token directly without a severe visual change, use the `sys` token directly.

Do not introduce a `dcs` token or a recipe just to wrap:

- one spacing token
- one radius token
- one size token
- a trivial combination of existing `sys` tokens that does not represent a governed design rule

`dcs` and recipes exist to centralize real design decisions, not to hide basic token usage behind extra indirection.

### Rule A: Prefer Tokens for Governed Outputs

Use tokens when the output itself should be stable, named, reviewed, and shared.

Examples:

- page inline padding
- CTA minimum height
- emphasis border color
- compact card padding
- hero section vertical rhythm

### Rule B: Prefer Recipes for Governed Logic or Stable Shared Treatments

Use SCSS mixins/functions/recipes only when the main asset is:

- governed logic, or
- a stable shared treatment that cannot be cleanly expressed by direct `sys` consumption alone

Examples:

- safe-area-aware layout formulas
- fluid spacing/typography formulas
- theme/state-aware surface treatment
- focus ring construction
- interaction state styling

Non-examples:

- a mixin that only sets `gap: var(--sys-spacing-med)`
- a mixin that only sets a standard button padding/min-height already readable inline

This avoids over-tokenizing every repeated CSS expression while still centralizing the actual design rules.

## 3. Target Architecture

Adopt a 4-part design-system structure.

### Part 1: Reference Tokens

Purpose: raw design primitives only.

- file family: `src/styles/_ref.scss`
- examples:
  - palette ramps
  - spacing scale
  - radius scale
  - typography primitives
  - shadows

Rules:

- no semantic meaning
- no component ownership
- no adaptive behavior

### Part 2: System Tokens

Purpose: app-wide semantic roles.

- file family: `src/styles/_sys.scss`
- examples:
  - `color.primary`
  - `color.surface-container`
  - `spacing.med`
  - `radius.med`

Rules:

- maps reference primitives into shared semantic roles
- remains global in meaning
- does not encode surface-specific contracts

### Part 3: Decision System

Purpose: the authorized layer for design decisions beyond raw global semantics.

Recommended source files:

- `src/styles/_dcs.scss`
- `src/styles/_recipes.scss`

Naming rule:

- use `dcs` as the token shorthand
- examples:
  - `--dcs-layout-page-padding-inline`
  - `--dcs-space-section-gap-roomy`
  - `--dcs-interaction-cta-min-height`
  - `--dcs-surface-accent-soft-border`

The decision system has two mechanisms, not two peer layers:

- decision tokens:
  - named governed outputs
- recipes:
  - governed logic implemented as SCSS functions/mixins, optionally backed by tokens

Explicit rule:

- recipes may depend on tokens, but should not become a parallel variable-emission layer unless that is an intentional design-system decision

Decision domains should be organized by meaning, for example:

- `dcs.layout.*`
- `dcs.space.*`
- `dcs.type.*`
- `dcs.surface.*`
- `dcs.interaction.*`
- `dcs.motion.*` if needed

Rules:

- a decision belongs here if it should be reused, reviewed, and changed centrally
- recipes may use `clamp(...)`, `calc(...)`, `color-mix(...)`, media queries, and theme/state branching when that logic is part of the governed rule
- components, pages, and domain/app UI sections should consume these decisions, not recreate them

### Part 4: Component Tokens

Purpose: stable contracts for reusable primitive/base components only.

Recommended source files:

- optional `src/styles/_component.scss`
- optional split files such as `src/styles/component/_button.scss`

Component tokens are intentionally narrow. They are not a general escape hatch for local semantics.

## 4. Source-of-Truth Rule

Every governed design decision must have one canonical owner.

Ownership order:

1. `ref` owns raw primitives
2. `sys` owns app-wide semantic roles
3. `dcs` owns governed outputs and governed logic
4. component tokens own stable primitive-component contracts

Rules:

- the same decision must not be redefined in pages or section-level consumers just because the local code is convenient
- theme and state variants must branch at the source-of-truth layer, not inside arbitrary consumers
- local styles may alias or compose decisions, but may not become a second source of truth

## 5. Theme and State Axis

The design system should treat theme and state as axes of existing decisions, not as ad hoc consumer overrides.

Examples:

- theme axis:
  - light/dark or future theme variants of `dcs.surface.*`
- state axis:
  - hover / active / focus / disabled / selected variants of interaction and surface decisions

Rules:

- if a surface treatment changes by theme or state in a reusable way, model it in `sys`, `dcs`, or component tokens
- do not let each consumer improvise its own hover tint, pressed scaling, or muted text treatment
- recipes may expose theme/state-aware mixins so consumers select a variant without inventing the math

## 6. Component-Token Promotion Rule

A pattern qualifies for component tokens only if all are true:

1. it belongs to a reusable primitive/base component
2. it appears, or is credibly expected to appear, in at least 3 consumers
3. it expresses a stable contract, not a one-off appearance
4. its variants are meaningful to expose as API

If any of these are false, the pattern should usually remain in `dcs` or in a surface-local composition layer.

## 7. Sharper Rule for Page/Widget Semantics

Pages, section-level UI, and feature surfaces still need local semantic structure. The rule should be:

- they may define local semantic aliases and local composition
- they may not define new governed values or governed logic

Allowed page/section-local semantics:

- naming local slots or regions with aliases bound to existing tokens
- assembling governed decisions into a local layout
- selecting an approved variant from `sys`, `dcs`, or component tokens

Examples of allowed local semantics:

- `--home-hero-gap: var(--dcs-space-section-gap-roomy);`
- `--contact-action-min-height: var(--dcs-interaction-cta-min-height);`
- a local grid that combines approved gap, padding, and border tokens

Forbidden page/section behavior:

- inventing a new tint percentage
- inventing a new fluid spacing curve
- inventing a new safe-area formula
- inventing a new breakpoint-based typography rule
- creating a private token namespace to legitimize one-off values

This gives pages and section-level UI semantic structure without letting them become miniature design systems.

## 8. Policy: Decision Invention vs Structural Composition

The policy should be written around decision invention, not around banning syntax.

### Allowed Structural Composition

Allowed in components, pages, and section-level UI:

- consuming `--sys-*`, `--dcs-*`, and approved `--comp-*`
- local aliases to governed values
- assembling layouts from governed values
- selecting documented variants
- using approved recipes/mixins/functions
- using CSS functions for intrinsic layout/content logic where no design decision is being invented

Examples:

- `minmax(0, 1fr)`
- `calc(100% - 2rem)` for content mechanics, if not expressing a governed design rule
- local layout composition using existing governed padding/gap tokens

### Forbidden Local Decision Invention

Forbidden outside approved design-system sources:

- creating a new design value when an existing governed value should own it
- encoding reusable visual logic directly in the consumer
- encoding a new adaptive rule in a page/section/component that should be centrally governable
- tuning color/spacing/type/state behavior locally in a way that other consumers cannot discover or reuse

This policy is stricter and more accurate than trying to ban individual CSS functions wholesale.

## 9. Proposed SCSS API Shape

The current style utilities should grow from low-level variable access into a design-system API.

### Token Emission

- keep `ref` and `sys` maps
- add nested `dcs` maps for governed outputs
- emit `--dcs-*` variables from `src/styles/index.scss`

### Functions

Examples:

- `fn.dcs-var(layout, page-padding-inline)`
- `fn.dcs-var(surface, accent-soft-border)`
- `fn.comp-var(button, action-min-height)`

### Recipes / Mixins

Examples:

- `@include mx.pu-safe-top-padding(hero)`
- `@include mx.pu-fluid-gap(section, roomy)`
- `@include mx.pu-surface(accent, subtle)`
- `@include mx.pu-focus-ring(primary)`
- `@include mx.pu-interaction-state(button, primary)`

Principle:

- tokens expose named outputs
- recipes encode governed logic
- consumers compose, but do not decide

## 10. Migration Strategy

Do not do a blind repo-wide cleanup first. Fix the ownership model, then migrate by leverage.

Architecture note:

- the frontend ownership model has now been materially stabilized around `domains/*`, `shared/*`, `pages/*`, and `processes/*`
- subsequent token migration work should target those owners directly and should not plan around retired legacy buckets such as `widgets/*`, top-level `features/*`, or top-level `queries/*`

### Phase 0 - Audit by Decision Type

Goals:

- inventory where the codebase is inventing decisions locally
- separate governed decisions from harmless structural composition
- define the first batch of `dcs` outputs and recipes

Audit buckets:

- surface/color decision invention
- spacing/sizing decision invention
- fluid/adaptive decision invention
- safe-area/layout decision invention
- theme/state decision invention

Suggested first audit targets:

- `src/pages/HomePage.vue`
- `src/domains/landing/ui/sections/*`
- `src/pages/ContactSupportPage.vue`
- `src/pages/CommunityPRPage.vue`
- `src/pages/AnchorPRPage.vue`
- share/admin style-heavy surfaces

### Phase 1 - Build the Decision System

Goals:

- introduce `dcs` token maps and recipe files
- codify source-of-truth boundaries
- encode theme/state-aware decisions centrally where needed

Implementation items:

- add `src/styles/_dcs.scss`
- add `src/styles/_recipes.scss`
- extend `src/styles/index.scss` to emit `--dcs-*`
- extend `src/styles/_functions.scss` with `dcs` access helpers
- extend `src/styles/_mixins.scss` or forward from `_recipes.scss`
- document component-token promotion criteria

Definition of done:

- the most common repeated outputs and formulas in the current hotspots are representable through `dcs` tokens and recipes

### Phase 2 - Migrate Shared Primitives First

Goals:

- improve default consumption paths before touching many screens

Priority targets:

- page scaffold primitives
- common action/button-like components
- badges / pills / section-card surfaces
- shared interaction-state treatments

Expected result:

- route and section-level styles stop recreating the same decisions because primitives already express them

### Phase 3 - Migrate High-Bypass Surfaces

Recommended order:

1. landing page and landing-domain sections
2. contact/support pages
3. PR detail pages
4. share-related components
5. admin pages

Migration rule:

- when several files share one invented decision, promote first, then replace all consumers
- do not convert one-off values into private local tokens

### Phase 4 - Document the Governance Model

Files to update:

- `apps/frontend/AGENTS.md`
- `apps/frontend/src/components/AGENTS.md`
- `apps/frontend/src/styles/AGENTS.md`
- add `apps/frontend/src/styles/TOKEN-GOVERNANCE.md`

The documentation should define:

- layer responsibilities
- source-of-truth rule
- theme/state axis rule
- allowed page/section-local semantics
- component-token promotion criteria
- decision invention vs structural composition
- escalation path for token gaps

### Phase 5 - Add Automated Guardrails

Guardrails should enforce the governance model, not a naive syntax blacklist.

Goals:

- detect likely local decision invention
- preserve necessary structural composition
- keep exceptions narrow and explicit

Guardrail ideas:

- lint for raw literals on governed properties outside approved sources
- lint for local adaptive rules on governed properties where recipes should be used
- lint for consumer-local color/state tuning that bypasses `dcs` or component contracts
- allow controlled exceptions for intrinsic/content-driven layout mechanics

Sequencing:

- start in report mode
- promote to blocking only after Phases 1-3 land for the first migration batch

## 11. File Change Plan

Expected new files:

- `apps/frontend/src/styles/_dcs.scss`
- `apps/frontend/src/styles/_recipes.scss`
- optional `apps/frontend/src/styles/_component.scss`
- `apps/frontend/src/styles/TOKEN-GOVERNANCE.md`

Expected modified files:

- `apps/frontend/src/styles/index.scss`
- `apps/frontend/src/styles/_functions.scss`
- `apps/frontend/src/styles/_mixins.scss`
- `apps/frontend/AGENTS.md`
- `apps/frontend/src/components/AGENTS.md`
- `apps/frontend/src/styles/AGENTS.md`

Likely first migration targets:

- `apps/frontend/src/shared/ui/layout/PageScaffold.vue`
- `apps/frontend/src/shared/ui/layout/PageScaffoldCentered.vue`
- `apps/frontend/src/shared/ui/layout/PageScaffoldFlow.vue`
- `apps/frontend/src/pages/HomePage.vue`
- `apps/frontend/src/domains/landing/ui/sections/*`
- `apps/frontend/src/pages/ContactSupportPage.vue`

## 12. Definition of Done

The task is complete when:

- the frontend has a documented source-of-truth model across `ref`, `sys`, `dcs`, and component contracts
- governed outputs are represented as tokens where appropriate
- governed logic is centralized as recipes where appropriate
- theme/state behavior is modeled at the correct owner layer
- page and section-level styles use local semantics for composition without inventing new decisions
- component tokens are only used where the promotion criteria are satisfied
- high-bypass surfaces are migrated off local decision invention
- automated guardrails exist and catch regressions
- `pnpm --filter @partner-up-dev/frontend build` passes

## 13. Validation Plan

### Build Validation

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm build`

### Manual Validation

- verify key routes still render correctly across mobile widths
- verify scaffold safe-area behavior still works through shared recipes
- verify shared actions/cards/pills now consume governed outputs instead of bespoke values
- verify theme/state styling remains visually coherent after centralization
- verify migrated files no longer invent reusable design decisions locally

## 14. Risks and Mitigations

- Risk: `dcs` becomes a dumping ground of arbitrary formulas.
  - Mitigation: require semantic naming by intent and keep governed logic in recipes when the logic itself is the reusable asset.

- Risk: component tokens become premature abstraction.
  - Mitigation: enforce the explicit promotion rule and keep reusable-but-not-component-specific decisions in `dcs`.

- Risk: pages and section-level UI lose useful local semantics.
  - Mitigation: explicitly allow local semantic aliases and local composition while forbidding local decision invention.

- Risk: lint rules overfit syntax and miss the real governance problem.
  - Mitigation: encode the checks around governed properties and ownership boundaries, not around isolated CSS features.

## 15. Suggested Delivery Split

1. PR-1: audit + `dcs` architecture + source-of-truth rules
2. PR-2: shared primitives + core recipes
3. PR-3: landing/home migration
4. PR-4: remaining high-bypass surfaces
5. PR-5: docs + automated guardrails
