# UnoCSS Vite Peer Warning

## Objective & Hypothesis

Resolve the existing frontend install peer warning where UnoCSS 0.60.x does not declare Vite 6 support.

Hypothesis: upgrading the UnoCSS package family to 66.6.x and switching from the deprecated `presetWind` name to `presetWind3` will align the frontend toolchain with Vite 6 without changing runtime product behavior.

## Guardrails Touched

- Frontend dev dependency graph.
- UnoCSS Vite integration.
- UnoCSS preset configuration and generated utility CSS.
- Frontend build and token governance verification.

## Verification

- `pnpm install --lockfile-only` passed. The UnoCSS/Vite peer warning no longer appears.
- `pnpm install` passed and updated local dependencies.
- `pnpm install --frozen-lockfile` passed.
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit` passed.
- `pnpm list unocss @unocss/vite @unocss/preset-icons --filter @partner-up-dev/frontend` reports `66.6.8` for all three packages.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
- `pnpm test:scenario system` passed: 15 tests.

Notes:

- `@types/html2canvas@1.0.0` still reports a deprecation warning during install. That is unrelated to the UnoCSS/Vite peer warning.
- System scenario migrations emit existing PostgreSQL identifier truncation notices. The scenario suite passed.
