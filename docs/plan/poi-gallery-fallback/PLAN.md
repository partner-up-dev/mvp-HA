# POI Gallery Fallback Plan

## Goal

Implement three linked capabilities:

1. Add backend `pois` table (id is natural-language `text`, no foreign keys), with `gallery: text[]`.
2. Update `EventCard`: when `anchorEvent.coverImage` is null, fallback to POI gallery by `locationPool`, and auto-rotate images.
3. Update PR detail page: query POI gallery by PR `location`; if found, show a `查看图片` link under location row; clicking opens a gallery modal component.

---

## Explore Findings (Current Codebase)

### Backend

- Drizzle entities are under `apps/backend/src/entities/*.ts`, exported via `apps/backend/src/entities/index.ts`, and auto-scanned by `drizzle.config.ts`.
- Route mounting is centralized in `apps/backend/src/index.ts`.
- Existing Event APIs:
  - `GET /api/events` in `apps/backend/src/controllers/anchor-event.controller.ts`
  - `GET /api/events/:eventId`
- Event list DTO currently **does not include** `locationPool`, only `locationCount`; `EventCard` only receives event summary.

### Frontend

- `EventCard` is used in both:
  - `apps/frontend/src/pages/EventPlazaPage.vue`
  - `apps/frontend/src/widgets/home/HomeEventHighlights.vue`
- `EventCard` currently only shows `coverImage` or placeholder block.
- PR detail page is `apps/frontend/src/pages/PRPage.vue`; location is rendered inside `apps/frontend/src/components/pr/PRCard.vue`.
- Modal primitive exists: `apps/frontend/src/components/common/Modal.vue`.
- Query pattern uses Vue Query + Hono RPC inferred types.

### Domain Behavior Relevant to Matching

- `anchor_events.locationPool` entries are `{ key, label }`.
- Anchor PR creation path (`expand-full-anchor-pr.ts`) currently writes `location = entry.label`.
- Therefore POI matching should prioritize **label text** (same natural-language strings).

---

## Options Considered

### Option A: EventCard queries POI per card from frontend

- Pros: minimal backend change.
- Cons: many repeated requests; weak typing at card-level; duplicate matching logic in multiple places.

### Option B (Chosen): Backend enriches event list/detail with matched gallery

- Add POI query endpoint and reuse in frontend PR page.
- Keep EventCard simple: consume already-merged fallback gallery list from event summary.
- Pros: less frontend request fan-out, centralized matching, easier future cache.
- Cons: event DTO change (acceptable).

---

## Chosen Design

## 1) Backend: New POI table + query endpoint

### Schema

- New entity file: `apps/backend/src/entities/poi.ts`
  - `pois` table:
    - `id: text` (PK, natural language string)
    - `gallery: text[]` default empty array, not null
    - `createdAt`, `updatedAt`
  - Export Drizzle-Zod schemas + types.
- Export from `apps/backend/src/entities/index.ts`.
- Generate migration SQL via `pnpm db:generate`.

### Repository

- New file: `apps/backend/src/repositories/PoiRepository.ts`
  - `findByIds(ids: string[]): Promise<Poi[]>`
  - Internal dedupe + empty-guard.

### Controller & Routing

- New file: `apps/backend/src/controllers/poi.controller.ts`
  - `GET /api/pois/by-ids?ids=a,b,c`
  - Validate with `zValidator("query", schema)`.
  - Parse CSV, trim, dedupe.
  - Return shape:

```ts
Array<{
  id: string;
  gallery: string[];
}>
```

- Mount in `apps/backend/src/index.ts` as `.route("/api/pois", poiRoute)`.

## 2) Backend: Event summary payload adds location pool + fallback gallery

Update `apps/backend/src/domains/anchor-event/use-cases/list-events.ts`:

- Extend `AnchorEventSummary` to include:
  - `locationPool: string[]` (labels first)
  - `fallbackGallery: string[]` (merged from matched POIs, deduped)
- Build fallback gallery by:
  - collecting event `locationPool` labels
  - querying `PoiRepository.findByIds(...)`
  - flatten + dedupe URL list

This lets `EventCard` consume one field directly.

## 3) Frontend: EventCard cover fallback carousel

### Data

- `useAnchorEvents` inferred type auto-updates from backend `AppType`.
- `EventCard` uses:
  - primary: `event.coverImage`
  - fallback: first from `event.fallbackGallery`

### UI behavior

- If `coverImage` exists: unchanged single image.
- Else if fallback gallery exists:
  - show auto-rotating image carousel in cover area.
  - no extra controls (minimal UX).
  - pause rotation on unmount.
- Else: existing placeholder.

Target file:

- `apps/frontend/src/components/event/EventCard.vue`

## 4) Frontend: PR page POI gallery link + modal component

### Data flow

- New query hook: `apps/frontend/src/queries/usePoisByIds.ts`
  - calls `client.api.pois["by-ids"].$get({ query: { ids } })`.
  - query key added in `apps/frontend/src/shared/api/query-keys.ts`.
- In `PRPage.vue`:
  - derive `locationId` from `prDetail.location`.
  - query POI by that single id.
  - derive `locationGallery`.

### UI placement

- Keep location row in `PRCard`.
- Add optional slot region **directly below location value** in `PRCard`:
  - if gallery exists, render `查看图片` text link.
- Clicking link emits event to parent page and opens modal.

### New component

- `apps/frontend/src/components/pr/PRLocationGalleryModal.vue`
  - uses existing `Modal.vue`
  - props: `open`, `images: string[]`, `title?: string`
  - simple image browser:
    - current image preview
    - prev/next buttons
    - index indicator (`1 / N`)
- `PRPage.vue` owns open/close state and uses `useBodyScrollLock` with this modal included.

## 5) i18n updates

- Update `apps/frontend/src/locales/zh-CN.jsonc` with keys for:
  - `prCard.viewLocationImages`
  - gallery modal title/empty/prev/next labels

---

## File Change Plan (Expected)

### Backend

- Add `apps/backend/src/entities/poi.ts`
- Update `apps/backend/src/entities/index.ts`
- Add `apps/backend/src/repositories/PoiRepository.ts`
- Add `apps/backend/src/controllers/poi.controller.ts`
- Update `apps/backend/src/index.ts`
- Update `apps/backend/src/domains/anchor-event/use-cases/list-events.ts`
- Generate migration in `apps/backend/drizzle/*`

### Frontend

- Add `apps/frontend/src/queries/usePoisByIds.ts`
- Update `apps/frontend/src/shared/api/query-keys.ts`
- Update `apps/frontend/src/components/event/EventCard.vue`
- Update `apps/frontend/src/components/pr/PRCard.vue` (slot/event extension)
- Add `apps/frontend/src/components/pr/PRLocationGalleryModal.vue`
- Update `apps/frontend/src/pages/PRPage.vue`
- Update `apps/frontend/src/locales/zh-CN.jsonc`

### Docs

- Update relevant product/dev docs if endpoint/domain capability appears in “Current State”.
- Write execution summary to `docs/plan/poi-gallery-fallback/RESULT.md` after implementation.

---

## Validation Plan

1. Run backend type/build checks:
   - `pnpm --filter @partner-up-dev/backend typecheck`
   - `pnpm --filter @partner-up-dev/backend build`
2. Run frontend build:
   - `pnpm --filter @partner-up-dev/frontend build`
3. Manual checks:
   - Event list with `coverImage != null` unchanged.
   - Event list with `coverImage == null` rotates POI gallery images.
   - PR detail with matched POI shows `查看图片` under location and opens modal.
   - PR detail without matched POI shows no link.

---

## Risks & Mitigation

- Risk: location text mismatch (`label` vs raw PR location variant).
  - Mitigation: exact-match first; fallback could later add normalized match function, but not in this scope.
- Risk: large gallery arrays increase payload size.
  - Mitigation: keep response limited to matched ids only; no global POI list endpoint.

---

## Questions Needing Confirmation

1. POI matching rule是否按**精确字符串匹配**即可（`locationPool.label` / `pr.location` 对 `pois.id`）？
2. `EventCard` fallback 轮播是否接受“自动轮播 + 无手动按钮”的最小交互？

---

## Next Gate

Wait for explicit user confirmation: `approve`.
