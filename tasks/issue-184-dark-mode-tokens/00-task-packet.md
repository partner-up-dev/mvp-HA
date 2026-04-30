# Issue 184 Dark Mode Tokens

## Objective & Hypothesis

Objective: repair dark-mode color tokens by restoring complete Material-derived dark semantic roles while preserving existing consumer token names.

Hypothesis: the visible dark-mode issues come from incomplete or inconsistent dark `sys.color` tokens. One concrete gap is `--sys-color-surface-variant`, which is used by frontend styles but is not emitted by the token layer.

## Guardrails Touched

- Frontend styling owner: `apps/frontend/src/styles`.
- Keep the mutation scoped to color tokens for dark mode.
- Preserve existing `--sys-color-*` consumers and avoid business component visual rewrites.
- Add a token-governance recurrence guard for used-but-undefined `--sys-color-*` variables.

## Verification

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
- `pnpm --filter @partner-up-dev/frontend build`

## Verification Results

- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Local preview started at `http://127.0.0.1:4001/`.

## Review Correction

- Replaced the existing non-primary `ref.$color` tonal palettes with Material-generated values instead of keeping a separate `material` namespace.
- Kept the existing `primary` palette as the brand color exception.
- Updated `sys.$light.color` and `sys.$dark.color` so semantic roles resolve from the normal `ref.$color` keys.
- Passed after namespace correction: `pnpm --filter @partner-up-dev/frontend build`
- Current working tree note: `pnpm --filter @partner-up-dev/frontend lint:tokens` and `lint:tokens:strict` are blocked by an unrelated finding in `AnchorEventListModeSurface.vue`.
