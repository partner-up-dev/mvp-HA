# Anchor Event Card Surface Split Task Packet

## Objective & Hypothesis

Split `AnchorEventCardModeSurface` into a directory module so the surface keeps template and behavior assembly in the Vue file while styles, prop contracts, emit contracts, constants, and local types move into adjacent files.

Hypothesis: this is a structural-only refactor. Keeping the component import explicit and preserving the same template/script behavior should leave runtime behavior unchanged while reducing single-file weight.

## Guardrails Touched

- Frontend domain UI surface under `apps/frontend/src/domains/event/ui/surfaces`.
- Existing consumers:
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorEventLandingPage.vue`
- Vue SFC scoped SCSS loading through an external `src` style block.

## Execution Steps

1. Move `AnchorEventCardModeSurface.vue` into `AnchorEventCardModeSurface/`.
2. Extract scoped styles to `AnchorEventCardModeSurface.scss`.
3. Extract local types, prop defaults, emit contracts, and constants to `AnchorEventCardModeSurface.ts`.
4. Update consumer imports to the new component path.
5. Verify with frontend build and diff hygiene checks.

## Verification

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed: `git diff --check` on touched files
