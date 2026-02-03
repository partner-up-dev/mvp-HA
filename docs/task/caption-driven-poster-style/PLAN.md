# PLAN — Caption-Driven Poster Style Alignment

## Objective

Remove `styleIndex` from poster HTML generation; instead, have caption generation return a poster style prompt that aligns with the caption's tone and content.

## Current State Analysis

### Caption Generation Flow

1. Frontend calls `POST /api/llm/xiaohongshu-caption` with `{ prId, style?: number }`
2. Backend uses `styleIndex` to select from caption style prompts (wraps around array)
3. Returns caption string only

### Poster Generation Flow

1. Frontend calls `POST /api/share/xiaohongshu/poster-html` with `{ prId, caption, style?: number }`
2. Backend uses `styleIndex` to select from poster HTML style prompts (wraps around array)
3. Returns HTML poster spec

### Problem

- Caption and poster styles are independently selected by index
- No semantic alignment between caption tone and poster visual style
- User clicks "换一个" → styleIndex increments → both caption and poster cycle through their respective arrays
- This can lead to mismatched combinations (e.g., professional caption with trendy poster)

## Proposed Solution

### High-Level Flow

1. Caption generation returns `{ caption: string, posterStylePrompt: string }`
2. Poster generation uses the provided `posterStylePrompt` instead of selecting by index
3. LLM ensures caption tone and poster style are aligned semantically

### Detailed Design

#### A. Backend Changes

##### A1. Update LLMService.generateXiaohongshuCaption

**Current signature:**

```typescript
async generateXiaohongshuCaption(
  prData: ParsedPartnerRequest,
  style?: number | XiaohongshuStyle,
): Promise<string>
```

**New signature:**

```typescript
async generateXiaohongshuCaption(
  prData: ParsedPartnerRequest,
  style?: number | XiaohongshuStyle,
): Promise<{ caption: string; posterStylePrompt: string }>
```

**Implementation approach:**

1. Keep existing caption generation logic (still uses styleIndex for caption style prompts)
2. Add a new LLM call to generate poster style prompt based on:
   - The generated caption
   - The PR data
   - The caption style used
3. Return both caption and posterStylePrompt

**Alternative approach (simpler):**

- Use a single LLM call with structured output: `{ caption: string, posterStylePrompt: string }`
- The system prompt asks LLM to generate both simultaneously
- Ensures maximum alignment between caption and poster style

##### A2. Update LLMService.generateXiaohongshuPosterHtml

**Current signature:**

```typescript
async generateXiaohongshuPosterHtml(params: {
  pr: { parsed: ParsedPartnerRequest; rawText: string };
  caption: string;
  style?: number;
}): Promise<PosterHtmlResponse>
```

**New signature:**

```typescript
async generateXiaohongshuPosterHtml(params: {
  pr: { parsed: ParsedPartnerRequest; rawText: string };
  caption: string;
  posterStylePrompt: string;
}): Promise<PosterHtmlResponse>
```

**Changes:**

- Remove `style` parameter and `pickPromptByIndex` logic
- Use `posterStylePrompt` directly as the system prompt

##### A3. Update ShareService.generateXiaohongshuPosterHtml

**Current signature:**

```typescript
async generateXiaohongshuPosterHtml(params: {
  prId: PRId;
  caption: string;
  style?: number;
}): Promise<PosterHtmlResponse>
```

**New signature:**

```typescript
async generateXiaohongshuPosterHtml(params: {
  prId: PRId;
  caption: string;
  posterStylePrompt: string;
}): Promise<PosterHtmlResponse>
```

**Changes:**

- Replace `style?: number` with `posterStylePrompt: string`
- Pass through to LLMService

##### A4. Update llm.controller.ts

**Current response:**

```typescript
return c.json({ caption });
```

**New response:**

```typescript
return c.json({ caption, posterStylePrompt });
```

##### A5. Update share.controller.ts

Update route `/api/share/xiaohongshu/poster-html`:

- Request schema: replace `style?: number` with `posterStylePrompt: string`
- Pass through to ShareService

#### B. Frontend Changes

##### B1. Update useGenerateXiaohongshuCaption

**Current return type:**

```typescript
Promise<string>
```

**New return type:**

```typescript
Promise<{ caption: string; posterStylePrompt: string }>
```

##### B2. Update useGenerateXhsPosterHtml

**Current params:**

```typescript
{
  prId: PRId;
  caption: string;
  style?: number;
}
```

**New params:**

```typescript
{
  prId: PRId;
  caption: string;
  posterStylePrompt: string;
}
```

##### B3. Update ShareToXiaohongshu.vue

**State changes:**

1. Remove `currentStyleIndex` ref
2. Update `generatedCaptions` to store `Map<number, { caption: string; posterStylePrompt: string }>`
3. Add `posterStylePrompt` ref

**Logic changes:**

1. `handleInitializeCaption`: store both caption and posterStylePrompt
2. `handleRegenerate`: increment index, generate new caption+prompt or use cached
3. `generatePosterForCurrentCaption`: use `posterStylePrompt` instead of `currentStyleIndex`
4. Handle manual caption edits: when user edits caption, posterStylePrompt becomes stale
   - Option 1: Reuse last generated posterStylePrompt (may mismatch)
   - Option 2: Generate new posterStylePrompt when caption is edited (extra API call)
   - Option 3: Use a default/neutral posterStylePrompt when caption is manually edited
   - **Recommended: Option 3** for simplicity

**Regeneration strategy:**

- Keep cycling behavior: each "换一个" cycles through different style indices
- Each index generates a new caption+posterStylePrompt pair (or retrieves from cache)
- Cache still works: `Map<number, { caption: string; posterStylePrompt: string }>`

#### C. WeChat Share Flow

**Current behavior:**

- WeChat card thumbnail generation also uses `style?: number`
- Should this also be updated?

**Decision:**

- **Out of scope for this task**
- WeChat thumbnail is independent of caption
- Can be addressed in a future iteration if needed

## Migration Strategy

### Phase 1: Backend (Breaking Changes)

1. Update LLMService methods
2. Update controllers and route schemas
3. Deploy backend

### Phase 2: Frontend

1. Update queries
2. Update ShareToXiaohongshu component
3. Deploy frontend

**Note:** This is a breaking change - backend and frontend must be deployed together.

## System Prompt Design

### Caption + Poster Style Prompt Generation

**Approach 1: Single LLM call (Recommended)**

System prompt for caption generation (update existing):

```
你是一位小红书文案写手和设计指导专家。

任务1 - 生成文案：
- 一句话，不超过16个字
- 口语化、有亲和力、有感染力
- 可以适当使用1-2个emoji表情
- 必须包含核心信息：做什么、什么时间、在哪、还差几人
- 风格要活泼、友好，让人有参与的欲望

任务2 - 生成海报风格指导：
- 为海报生成一段简短的风格指导（50-100字）
- 风格必须与文案的语气和情感高度一致
- 指导应包含：色调、排版风格、视觉重点、情感氛围
- 避免具体的技术细节（如像素、具体颜色代码）
- 示例："年轻活力的扁平风格，使用明亮色彩，标题突出居中，留白充足，传递轻松愉快的氛围"

输出格式：JSON { caption: "...", posterStylePrompt: "..." }
```

Response schema:

```typescript
z.object({
  caption: z.string().max(100),
  posterStylePrompt: z.string().min(20).max(200)
})
```

**Approach 2: Two separate LLM calls**

First call: generate caption (existing)
Second call: generate posterStylePrompt based on caption

System prompt for poster style generation:

```
你是一位海报设计风格指导专家。

根据给定的小红书文案，生成一段简短的海报视觉风格指导（50-100字）。

要求：
- 风格必须与文案的语气、情感、场景高度契合
- 包含：色调、排版风格、视觉重点、情感氛围
- 避免具体技术参数（像素、颜色代码）
- 保持"干净、可信、非营销"的核心原则

示例输出：
"温馨友好的暖色调，文字大而清晰，配合柔和的圆角几何元素，营造亲切可信的邻里氛围"
```

**Recommendation: Use Approach 1**

- Single API call, faster
- LLM can better align caption and style when generating simultaneously
- Simpler implementation

## Validation Plan

### Backend Tests

1. Verify new response format: `{ caption, posterStylePrompt }`
2. Test posterStylePrompt is used in HTML generation
3. Verify styleIndex is removed from all relevant code

### Frontend Tests

1. Generate caption → verify posterStylePrompt is received
2. Generate poster → verify posterStylePrompt is sent
3. Test "换一个" cycling with new cache structure
4. Test manual caption editing (posterStylePrompt fallback)

### Manual E2E Test

1. Open XHS share UI
2. Generate caption → verify poster matches caption tone
3. Click "换一个" 5 times → verify caption and poster styles remain aligned
4. Edit caption manually → verify poster still generates (with neutral style)
5. Download poster → verify quality

## Edge Cases & Fallbacks

### 1. Manual Caption Edit

When user edits caption, posterStylePrompt becomes misaligned.

**Solution:**

- Use a neutral/default posterStylePrompt
- Define: `const DEFAULT_POSTER_STYLE_PROMPT = "简洁大方的信息展示风格，文字清晰易读，留白充足，色彩克制，传递可信感"`
- Apply when caption is manually edited

### 2. LLM Failure

If LLM fails to generate posterStylePrompt:

**Solution:**

- Backend catches error and uses default posterStylePrompt
- Frontend receives valid response
- Existing template fallback still works if HTML generation fails

### 3. Backward Compatibility

This is a breaking API change.

**Solution:**

- No backward compatibility needed (internal API)
- Deploy backend and frontend together
- Document breaking change in commit message

## Config Migration

### Existing Config Keys (Keep for now)

- `xiaohongshu_style_prompt`: Array of caption style prompts (still used)
- `share.xiaohongshu_poster_html_style_prompts`: Array of poster HTML prompts (**deprecated after this change**)

### New Behavior

- `xiaohongshu_style_prompt`: Still used to select caption style by index
- Poster HTML style prompts: Generated dynamically by LLM, no longer read from config

### Future Cleanup

- Can remove `share.xiaohongshu_poster_html_style_prompts` config key in future
- For now, keep it but don't use it (to avoid DB migration)

## Implementation Steps

### Step 1: Update Backend Response Schema

- [ ] Update `LLMService.generateXiaohongshuCaption` to return `{ caption, posterStylePrompt }`
- [ ] Implement single LLM call with structured output
- [ ] Add default posterStylePrompt constant

### Step 2: Update Backend Poster Generation

- [ ] Update `LLMService.generateXiaohongshuPosterHtml` to accept `posterStylePrompt` instead of `style`
- [ ] Update `ShareService.generateXiaohongshuPosterHtml` signature
- [ ] Update `share.controller.ts` request schema

### Step 3: Update Backend Caption Route

- [ ] Update `llm.controller.ts` to return `{ caption, posterStylePrompt }`
- [ ] Update route to no longer increment/use styleIndex for poster generation

### Step 4: Update Frontend Queries

- [ ] Update `useGenerateXiaohongshuCaption` return type
- [ ] Update `useGenerateXhsPosterHtml` params type

### Step 5: Update Frontend Component

- [ ] Remove `currentStyleIndex` ref
- [ ] Update `generatedCaptions` cache structure
- [ ] Add `posterStylePrompt` ref
- [ ] Update `handleInitializeCaption`
- [ ] Update `handleRegenerate`
- [ ] Update `generatePosterForCurrentCaption`
- [ ] Handle manual caption edit with default posterStylePrompt

### Step 6: Testing & Validation

- [ ] Backend typecheck
- [ ] Frontend typecheck & build
- [ ] Manual E2E testing
- [ ] Update AGENTS.md documentation

## Files to Modify

### Backend

1. `apps/backend/src/services/LLMService.ts`
2. `apps/backend/src/services/ShareService.ts`
3. `apps/backend/src/controllers/llm.controller.ts`
4. `apps/backend/src/controllers/share.controller.ts`

### Frontend

1. `apps/frontend/src/queries/useGenerateXiaohongshuCaption.ts`
2. `apps/frontend/src/queries/useGenerateXhsPosterHtml.ts`
3. `apps/frontend/src/components/ShareToXiaohongshu/ShareToXiaohongshu.vue`

### Documentation

1. `apps/backend/AGENTS.md` (if needed)
2. `apps/frontend/AGENTS.md` (if needed)
3. `docs/task/caption-driven-poster-style/RESULT.md` (after completion)

## Open Questions

1. **Should we keep cycling behavior?**
   - Yes, increment index to cycle through different caption styles
   - Each caption style will generate its own aligned posterStylePrompt

2. **What happens on manual caption edit?**
   - Use default neutral posterStylePrompt
   - Accept potential style mismatch as trade-off for simplicity

3. **Should WeChat thumbnail also use this approach?**
   - No, out of scope for this task
   - WeChat thumbnail is independent of caption

4. **Should we remove deprecated config keys?**
   - No, keep them to avoid DB migration
   - Simply don't read from them anymore

## Success Criteria

- [ ] Caption generation returns both caption and posterStylePrompt
- [ ] Poster generation uses posterStylePrompt from caption generation
- [ ] styleIndex removed from poster generation pipeline
- [ ] "换一个" cycling still works, caption and poster styles remain aligned
- [ ] Manual caption edit doesn't break poster generation
- [ ] All TypeScript checks pass
- [ ] Manual E2E test passes
