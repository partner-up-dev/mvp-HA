# L3 Plan — Implementation steps & verification

## Steps

1. Update [apps/frontend/src/composables/renderHtmlPoster.ts](apps/frontend/src/composables/renderHtmlPoster.ts)
   - Add realm-aware helpers near the top of the module.
   - Refactor `pickRenderRoot` to use `isHTMLElementInDoc`.
   - Refactor `waitForBody` to use `isHTMLElementInDoc` and throw on timeout.

2. Validate
   - Run `pnpm --filter @partner-up-dev/frontend build` (includes `vue-tsc`).
   - (Optional) Manual: open XHS share UI, generate caption, ensure HTML poster renders without fallback warning.

## Rollback

- Revert the helper + refactor; behavior returns to current (fallback to template on false negatives).
