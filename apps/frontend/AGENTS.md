# AGENTS.md of PartnerUp MVP-HA Frontend

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (hc)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Coding Guidelines

- RPC Infer Type: Do not manually define interfaces for API returns; let TypeScript infer from the Hono client.
- Request Params: If backend uses `zValidator`, mismatched param types will cause type errors — do not bypass with `as any`.
- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.
- UnoCSS Icon Preset configured, use icons by `class="i-mdi-icon-name"`.
- Styling governance: use direct `sys` tokens first (Material3 style); add `dcs` only for real governed outputs; add recipes only for governed logic or stable shared treatments.
- Make use of SCSS features.
- Page layout reuse: Prefer `src/shared/ui/layout/PageScaffold.vue`, `PageScaffoldFlow.vue`, `PageScaffoldCentered.vue`, and `DesktopPageScaffold.vue` for route pages; do not duplicate root safe-area container styles in page files.
- Shared UI reuse: before adding page-local shells or feedback widgets, check `src/shared/ui/AGENTS.md` and prefer existing primitives such as `SurfaceCard`, `FormField`, `Button`, `InfoRow`, `Chip`, `ChipGroup`, `InlineNotice`, `EmptyState`, `ConfirmDialog`, and `Avatar` when the fit is real.
- Feature composition boundary: extract reusable feature UI + business logic into dedicated feature components (for example, `APRNotificationSubscriptions`) instead of leaving logic in page files.
- Container vs feature split: keep container components (for example, `WeChatNotificationSubscriptionsCard`) presentational-only; they should provide layout/shell and should not own feature side effects.
- Usage-site assembly: pages (for example, `AnchorPRPage`) should assemble container + feature components, and only own page context such as visibility, section placement, and page-level error aggregation.
- Reuse-first rule: if a second page needs the same feature behavior (for example, `MePage`), reuse the extracted feature component rather than duplicating handlers in page scope.

## Documents

Read following documents when needed and keep them current:

- `docs/20-product-tdd/*.md`
- `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant
- Architecture: `src/ARCHITECTURE.md`
- Vue Component Guideline: See `src/AGENTS.components.md`.
- Styling governance: `src/styles/TOKEN-GOVERNANCE.md`
- Styling agent rules: `src/styles/AGENTS.md`
- Data Fetching: See `src/queries/AGENTS.md`.

Useful commands:

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

## File Structure

Use `src/ARCHITECTURE.md` as the source of truth.

The active structure is:

```text
src/
├── app/                    # Application wiring
├── domains/                # Domain-owned code by business area
├── shared/                 # Cross-domain infrastructure and UI primitives
├── pages/                  # Route entrypoints only
├── stores/                 # Legacy compatibility seams only
├── lib/                    # Legacy compatibility seams only
├── locales/
├── router/                 # Legacy compatibility seams only
├── styles/
└── ...
```

Rules:

- New domain-owned modules belong under `src/domains/<domain>/*`.
- New cross-domain primitives or infrastructure belong under `src/shared/*`.
- App bootstrap, providers, and router wiring belong under `src/app/*`.
- Do not add new files under legacy buckets such as top-level `queries`, `features`, `entities`, or `widgets` unless explicitly maintaining a temporary compatibility seam.

## Product And Runtime Truth Sources

Keep this file operational (frontend architecture, composition boundaries, and coding rules) and avoid using it as a feature-state mirror.

For durable truth, use:

- Product what/why, workflows, and invariants: `docs/10-prd/**/*.md`
- Cross-unit technical truth and contracts: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`

For volatile implementation status or migration notes:

- record them in active `docs/task/<task>/` packets
- keep this file limited to stable frontend operating guidance
