# Cache Poster URLs in Partner Request Table

## Plan Date

2026-02-02

## Objective

Cache the generated poster URLs (Xiaohongshu sharing poster & WeChat sharing thumbnail) directly in the partner_requests table to:

1. Avoid regenerating posters on every share action
2. Reduce LLM API costs and latency
3. Improve user experience with instant poster availability
4. Enable poster URL persistence across sessions

## Current State Analysis

### How Posters Are Currently Generated

#### Xiaohongshu Poster Flow

1. **Frontend** (`ShareToXiaohongshu.vue`):
   - User clicks "换一个" → generates caption via `POST /api/llm/xiaohongshu-caption`
   - Calls `POST /api/share/xiaohongshu/poster-html` with `{ prId, caption, posterStylePrompt }`
   - **Backend** (`ShareService`) → `LLMService.generateXiaohongshuPosterHtml()` generates HTML
   - **Frontend** renders HTML to PNG blob via `renderPosterHtmlToBlob()`
   - In **WeChat browser**: uploads blob to `POST /api/upload/poster` → stores at `POSTERS_DIR/{uuid}.png`
   - Returns download URL: `/api/upload/download/{key}`
   - In **other browsers**: uses blob URL directly (`URL.createObjectURL(blob)`)
   - **Frontend caching**: Stores `posterUrl` in memory per `captionCounter` index in `generatedCaptions` Map

#### WeChat Card Thumbnail Flow

1. **Frontend** (`ShareToWechat.vue`):
   - Calls `POST /api/share/wechat-card/thumbnail-html` with `{ prId, style }`
   - **Backend** → `LLMService.generateWeChatCardThumbnailHtml()` generates HTML
   - **Frontend** renders HTML to PNG blob
   - Uploads blob to `POST /api/upload/poster`
   - Returns download URL
   - Uses URL to call `setWeChatShareCard({ imgUrl })`

### Problems with Current Approach

1. **No persistence**: Poster URLs only cached in frontend memory → lost on page refresh
2. **Redundant generation**: Same poster regenerated for same PR+caption/style combination
3. **LLM cost**: Every share action triggers LLM API call (expensive)
4. **Latency**: 2-5 seconds generation time on every share
5. **Storage waste**: Multiple uploads of identical posters with different UUIDs

## Design Decision (Cache in partner_requests table)

**Pros:**

- Simple schema change (add 2 JSON columns)
- Data locality: poster URLs live with PR data
- Easy invalidation: clear cache when PR content changes
- Minimal service layer changes

**Cons:**

- Couples poster generation to PR entity
- Multiple poster variants need array/object storage

**Schema:**

```typescript
{
  xiaohongshuPosters: {
    caption: string;
    posterStylePrompt: string;
    posterUrl: string;
  }[];
  wechatThumbnails: {
    style: number;
    posterUrl: string;
  }[];
}
```

### Database Schema Changes

Change plan to cache only one poster/thumbnail per partner request.

### Database schema change

Add two JSONB columns that store a single cached poster/thumbnail (nullable):

```sql
ALTER TABLE partner_requests
  ADD COLUMN xiaohongshu_poster JSONB DEFAULT NULL,
  ADD COLUMN wechat_thumbnail JSONB DEFAULT NULL;
```

Each column stores an object or NULL. Example value for `xiaohongshu_poster`:

```json
{
  "caption": "...",
  "posterStylePrompt": "...",
  "posterUrl": "https://.../download/key",
  "createdAt": "2026-02-02T12:34:56.000Z"
}
```

### Entity Schema (TypeScript)

Add single-entry schemas and fields in `apps/backend/src/entities/partner-request.ts`:

```typescript
export const xiaohongshuPosterSchema = z.object({
  caption: z.string(),
  posterStylePrompt: z.string(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export const wechatThumbnailSchema = z.object({
  style: z.number().int().nonnegative(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

// partnerRequests table definition additions:
// xiaohongshuPoster: jsonb('xiaohongshu_poster').$type<...>().default(null)
// wechatThumbnail: jsonb('wechat_thumbnail').$type<...>().default(null)
```

## Implementation Plan

### Step 1: Database Migration

**File:** `apps/backend/drizzle/0002_add_poster_cache.sql`

```sql
ALTER TABLE partner_requests 
ADD COLUMN xiaohongshu_posters JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN wechat_thumbnails JSONB DEFAULT '[]'::jsonb NOT NULL;
```

**Tasks:**

- Create migration file
- Update Drizzle schema snapshot
- Test migration locally

### Step 2: Update Entity Layer

**File:** `apps/backend/src/entities/partner-request.ts`

**Changes:**

- Add Zod schemas for poster cache entries
- Add new fields to `partnerRequests` table definition
- Update TypeScript types

### Step 3: Update Repository Layer

**File:** `apps/backend/src/repositories/PartnerRequestRepository.ts`

**Add methods:**

```typescript
async addXiaohongshuPoster(
  id: PRId, 
  cache: XiaohongshuPosterCache
): Promise<PartnerRequest | null>

async addWechatThumbnail(
  id: PRId, 
  cache: WechatThumbnailCache
): Promise<PartnerRequest | null>

async findXiaohongshuPoster(
  id: PRId, 
  caption: string, 
  posterStylePrompt: string
): Promise<string | null> // returns posterUrl or null

async findWechatThumbnail(
  id: PRId, 
  style: number
): Promise<string | null> // returns posterUrl or null

async clearPosterCache(id: PRId): Promise<void>
```

**Implementation notes:**

- `findXiaohongshuPoster()`: exact match on `caption` + `posterStylePrompt`
- Consider fuzzy matching for minor caption edits (future enhancement)
- Cache size limit: max 10 entries per type (FIFO eviction)

### Step 4: Update Service Layer

**File:** `apps/backend/src/services/ShareService.ts`

**Update `generateXiaohongshuPosterHtml()`:**

```typescript
async generateXiaohongshuPosterHtml(params: {
  prId: PRId;
  caption: string;
  posterStylePrompt: string;
  skipCache?: boolean; // for testing/regeneration
}): Promise<PosterHtmlResponse & { posterUrl?: string }> {
  // 1. Check cache first
  if (!params.skipCache) {
    const cached = await this.prRepo.findXiaohongshuPoster(
      params.prId,
      params.caption,
      params.posterStylePrompt
    );
    if (cached) {
      return {
        html: '', // not needed when serving from cache
        width: 720,
        height: 1080,
        posterUrl: cached, // return cached URL
        fromCache: true,
      };
    }
  }

  // 2. Generate HTML (existing logic)
  const pr = await this.prService.getPR(params.prId);
  const result = await this.llmService.generateXiaohongshuPosterHtml({
    pr,
    caption: params.caption,
    posterStylePrompt: params.posterStylePrompt,
  });

  assertHtmlSafe(result.html);
  
  return { ...result, fromCache: false };
}

async cacheXiaohongshuPoster(params: {
  prId: PRId;
  caption: string;
  posterStylePrompt: string;
  posterUrl: string;
}): Promise<void> {
  await this.prRepo.addXiaohongshuPoster(params.prId, {
    caption: params.caption,
    posterStylePrompt: params.posterStylePrompt,
    posterUrl: params.posterUrl,
    createdAt: new Date().toISOString(),
  });
}
```

**Update `generateWeChatCardThumbnailHtml()`:** (similar pattern)

### Step 5: Update Controllers

**File:** `apps/backend/src/controllers/share.controller.ts`

**Add new endpoints:**

```typescript
// Cache poster URL after frontend renders & uploads
POST /api/share/xiaohongshu/cache-poster
{
  prId: number;
  caption: string;
  posterStylePrompt: string;
  posterUrl: string; // URL from upload endpoint
}

POST /api/share/wechat-card/cache-thumbnail
{
  prId: number;
  style: number;
  posterUrl: string;
}
```

**Update existing endpoints:**

- Add `fromCache` flag to response
- If cached, return `posterUrl` directly (skip HTML generation)

### Step 6: Update Frontend

#### Update `ShareToXiaohongshu.vue`

**Changes:**

1. After uploading poster, call cache endpoint:

   ```typescript
   await client.api.share.xiaohongshu['cache-poster'].$post({
     json: {
       prId: props.prId,
       caption: currentCaption,
       posterStylePrompt: posterStylePrompt.value,
       posterUrl: nextPosterUrl,
     },
   });
   ```

2. Check for cached poster before generation:

   ```typescript
   const spec = await generatePosterHtmlAsync({
     prId: props.prId,
     caption: currentCaption,
     posterStylePrompt: posterStylePrompt.value,
   });

   if (spec.fromCache && spec.posterUrl) {
     posterUrl.value = spec.posterUrl;
     return; // skip rendering
   }
   ```

#### Update `ShareToWechat.vue`

**Changes:** Similar pattern - check cache first, cache after upload

### Step 7: Cache Invalidation Strategy

**When to clear cache:**

1. **PR content updated** (`PUT /api/pr/:id`):
   - Clear all poster caches for this PR
   - User likely wants new posters reflecting updated content

2. **PR deleted** (future):
   - Delete associated poster files from storage
   - Remove PR record (cascade deletes cache)

**Implementation:**

```typescript
// apps/backend/src/services/PartnerRequestService.ts
async updatePRContent(id: PRId, parsed: ParsedPartnerRequest, pin: string) {
  // ...existing validation

  // Clear poster cache when content changes
  await this.prRepo.clearPosterCache(id);

  const updated = await this.prRepo.updateParsed(id, parsed);
  // ...
}
```

### Step 8: Testing Checklist

- [ ] Migration runs successfully
- [ ] Create PR → cache starts empty
- [ ] Generate Xiaohongshu poster → HTML generated → upload → cache saved
- [ ] Regenerate same caption → returns cached URL (no LLM call)
- [ ] Edit caption → generates new poster → new cache entry
- [ ] WeChat thumbnail flow works similarly
- [ ] Update PR content → cache cleared → new posters generated
- [ ] Cache limit enforced (max 10 per type)
- [ ] Frontend shows instant load for cached posters
- [ ] No LLM calls for cached posters (check logs)

## Rollout Strategy

1. **Phase 1** (Backend only):
   - Deploy migration
   - Deploy repository/service changes
   - Deploy cache endpoints
   - Test with API client (Postman/curl)

2. **Phase 2** (Frontend integration):
   - Deploy frontend changes
   - Monitor cache hit rate
   - Monitor LLM cost reduction

3. **Phase 3** (Optimization):
   - Add cache analytics (hits/misses)
   - Consider background poster pre-generation for common patterns
   - Add admin endpoint to clear cache if needed

## Success Metrics

- **Cache hit rate**: Target >60% after initial generation
- **LLM cost reduction**: Target 50-70% reduction in poster generation API calls
- **Latency improvement**: Cached poster load <100ms (vs 2-5s generation)
- **User experience**: Instant poster on revisit/refresh

## Documentation Updates Required

After implementation:

- Update `apps/backend/AGENTS.md` - document poster cache columns
- Update `apps/backend/src/entities/AGENTS.md` - document new schemas
- Update `apps/backend/src/repositories/AGENTS.md` - document new methods
- Update `apps/backend/src/services/AGENTS.md` - document cache flow
- Update `apps/frontend/src/components/AGENTS.md` - document cache usage

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache grows too large | DB bloat | Enforce max 10 entries per type with FIFO eviction |
| Stale posters shown | User confusion | Clear cache on PR content update |
| Cache key collision | Wrong poster returned | Use exact match on caption + stylePrompt (composite key) |
| Migration breaks prod | Downtime | Test migration on staging; use `DEFAULT '[]'` for safety |
| Cached URL becomes invalid | Broken images | Keep uploaded files indefinitely; add health check endpoint |

## Dependencies

- Drizzle ORM migration system
- Existing upload/download endpoints (`/api/upload/poster`, `/api/upload/download/:key`)
- POSTERS_DIR storage (filesystem or mounted OSS)

## Notes

- Keep uploaded poster files indefinitely (no TTL expiration) since URLs are cached in DB
- Consider adding created_at timestamp to cache entries for future analytics
- Frontend memory cache in `generatedCaptions` Map can be kept as-is for instant in-session switching
- Backend cache serves cross-session persistence
