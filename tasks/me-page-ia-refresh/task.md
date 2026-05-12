# Me Page IA Refresh

## Objective & Hypothesis

Refresh `/me` so the personal profile card becomes the compact identity hub, with PR history and POI application entries presented as two equal shortcuts below it. This should reduce settings-page sprawl while keeping `/pr/mine` as the durable PR history route.

## Guardrails Touched

- Product IA for `/me`, `/pr/mine`, and POI application revisit.
- Frontend route page composition in `apps/frontend/src/pages/MePage.vue`.
- Footer navigation behavior in common footer components.
- Locale schema and Chinese copy.

## Verification

- Updated durable PRD docs before implementation.
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Refined WeChat identity row to keep its action below the description and reduced shortcut-card hover treatment.
- Inspected changed files for unrelated workspace modifications before final summary. `apps/frontend/src/locales/schema.ts` and `apps/frontend/src/locales/zh-CN.jsonc` already carried admin-navigation changes outside this slice.
