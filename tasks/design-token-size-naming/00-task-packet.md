# Design Token Size Naming

## Objective & Hypothesis

Unify frontend design-token size words to the canonical full-word ladder:
`xsmall`, `small`, `medium`, `large`, `xlarge`.

Hypothesis: updating the styling token maps, emitted custom property consumers,
UnoCSS preset token utilities, and style guidance keeps runtime behavior stable
while making token names internally consistent.

Observed legacy aliases covered in this slice:

- `2xs` and `xs` -> `xsmall`
- `sm` -> `small`
- `md` and `med` -> `medium`
- `lg` -> `large`
- `xl`, `xSmall`, and `xLarge` -> `xlarge` / `xsmall` by case-normalized
  intent

## Guardrails Touched

- Input type: Constraint
- Active mode: Execute
- Durable owner: `apps/frontend/src/styles`
- Local rules: `apps/frontend/AGENTS.md`, `apps/frontend/src/styles/AGENTS.md`,
  `apps/frontend/src/AGENTS.components.md`
- Preserve semantic non-size tokens such as `none`, `full`, and `pill`;
  `pill` is emitted centrally so existing semantic usage resolves at runtime.
- Preserve component prop API naming for this slice.
- Preserve responsive breakpoint keys for this slice.
- Preserve current spacing scale values; `xlarge` is introduced as the
  full-word spelling for legacy `xl` references with the existing 32px value.

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - Exit code 0.
  - Current output still reports 10 token-governance findings outside baseline
    in pre-existing form-mode / ToggleSwitch / landing hardcoded style areas.
- `pnpm --filter @partner-up-dev/frontend build`
  - Passes.
- `rg` scan for old token CSS variable names, UnoCSS size utility keys, old icon
  mixin arguments, and overlap typos such as `xsmallmall` / `mediumium`.
  - No matches after cleanup.
- `git diff --check -- apps/frontend/src tasks/design-token-size-naming/00-task-packet.md`
  - Not used as a gate after preserving existing mixed/CRLF line endings in
    touched legacy files; Git reports the edited CRLF lines as trailing
    whitespace.
