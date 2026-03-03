# POI Gallery Fallback Result

## Completed

### Backend

- Added `pois` table entity with `id: text` and `gallery: text[]`:
  - `apps/backend/src/entities/poi.ts`
- Exported POI entity from entity index:
  - `apps/backend/src/entities/index.ts`
- Added POI repository for exact-id batch lookup:
  - `apps/backend/src/repositories/PoiRepository.ts`
- Added POI query endpoint:
  - `GET /api/pois/by-ids?ids=a,b,c`
  - `apps/backend/src/controllers/poi.controller.ts`
- Mounted POI route:
  - `apps/backend/src/index.ts`
- Extended anchor event list summary with fallback fields:
  - `locationPool: string[]`
  - `fallbackGallery: string[]`
  - `apps/backend/src/domains/anchor-event/use-cases/list-events.ts`
- Migration generated for POI table:
  - `apps/backend/drizzle/0001_pois_gallery_fallback.sql`
  - `apps/backend/drizzle/meta/_journal.json`
  - `apps/backend/drizzle/meta/0001_snapshot.json`

### Frontend

- Added POI by-ids query key:
  - `apps/frontend/src/shared/api/query-keys.ts`
- Added POI query hook:
  - `apps/frontend/src/queries/usePoisByIds.ts`
- Updated `EventCard` fallback behavior:
  - when `coverImage` is null, uses `event.fallbackGallery` and auto-rotates images
  - `apps/frontend/src/components/event/EventCard.vue`
- Extended `PRCard` with location extension slot:
  - `apps/frontend/src/components/pr/PRCard.vue`
- Added independent location gallery modal component:
  - `apps/frontend/src/components/pr/PRLocationGalleryModal.vue`
- Updated PR page:
  - exact-match lookup by `prDetail.location`
  - render `查看图片` under location when POI gallery exists
  - open modal to browse gallery
  - include modal in body scroll lock
  - `apps/frontend/src/pages/PRPage.vue`
- Added i18n keys and schema fields for location gallery:
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`

## Validation

- Backend typecheck: `pnpm --filter @partner-up-dev/backend typecheck`
- Backend build: `pnpm --filter @partner-up-dev/backend build`
- Frontend build: `pnpm --filter @partner-up-dev/frontend build`
- IDE diagnostics: no errors in changed backend/frontend files

## Matching Rule

- Implemented as confirmed: **exact string match**
  - `locationPool.label` / `pr.location` === `pois.id`
