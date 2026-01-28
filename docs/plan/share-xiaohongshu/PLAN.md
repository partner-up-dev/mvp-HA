# Xiaohongshu Share Feature - Implementation Plan

## Overview

Enhance SharePR.vue to add "Share to Xiaohongshu" functionality, allowing users to generate and share formatted captions with their partner requests.

**Status**: Planning  
**Scope**: Frontend only (no backend changes required)  
**Estimated Time**: 45 minutes  
**Complexity**: Medium  

---

## 📋 Key Observations from Code Exploration

### ✅ What We Have

1. **Data is Ready**: `ParsedPartnerRequest` in the RPC response contains all needed fields:
   - `title`, `scenario`, `time`, `location`, `minParticipants`, `maxParticipants`, `preferences`, `notes`

2. **SharePR.vue is Extensible**: Current implementation uses `ShareMethod` interface:

   ```typescript
   interface ShareMethod {
     id: string;
     label: string;
     options?: Component;
     action: () => Promise<void>;
     getPreviewContent: () => string;
   }
   ```

   This is perfect for adding new share methods.

3. **Utilities Exist**:
   - `copyToClipboard()` - works with both Clipboard API and fallback
   - `flashState()` - provides user feedback
   - Component state management pattern already established

### ⚠️ What We Need to Build

1. A new share method component for Xiaohongshu-specific UI
2. LLM-based caption generation (backend integration or client-side)
3. Poster generation (deferred to Phase 2)
4. App scheme handling for opening Xiaohongshu

---

## 🎯 Implementation Strategy

### **Phase 1: MVP (15 minutes) - Immediately Ship** ✅

Add Xiaohongshu to the carousel with:

- **Static caption generator**: Use template formatting without LLM
- **Copy to clipboard**: Reuse existing `copyToClipboard()` utility
- **No poster**: Just copy caption + link

**Why this approach:**

- Zero backend changes needed
- Low risk, high value
- Can be extended later

---

### **Phase 2: Enhanced Captions (15 minutes) - Optional**

Add LLM-generated captions:

- Create backend API: `POST /api/llm/generate-xiaohongshu-caption`
- Create composable: `useGenerateCopy.ts`
- Add loading state + regenerate button to ShareToXiaohongshu component

**Risk**: Requires backend LLM integration validation

---

### **Phase 3: Poster + App Scheme (15 minutes) - Future**

- Implement `useGeneratePoster.ts` (deferred to when poster generation service is ready)
- Implement `useAppScheme.ts` for opening Xiaohongshu app
- Full user flow with poster preview and long-press guidance

---

## 📁 File Structure

```
apps/frontend/src/
├── components/
│   ├── SharePR.vue (MODIFY - add Xiaohongshu method)
│   ├── ShareToXiaohongshu/
│   │   ├── index.vue (NEW - composable & main logic)
│   │   └── CopyEditor.vue (NEW - Phase 2, caption editing)
│   └── PosterPreview.vue (NEW - Phase 3, deferred)
│
├── composables/ (NEW FOLDER)
│   ├── useGenerateCopy.ts (Phase 2)
│   ├── useGeneratePoster.ts (Phase 3)
│   └── useAppScheme.ts (Phase 3)
│
└── queries/ (or services)
    └── useGenerateCopy.ts (Phase 2, if using Vue Query)
```

---

## 📝 Implementation Details

### Phase 1: MVP (SharePR.vue modification)

**Changes to SharePR.vue:**

```vue
<!-- Add to shareMethods computed -->
{
  id: "XIAOHONGSHU",
  label: "分享到小红书",
  action: async () => {
    const caption = generateXiaohongshuCaption(prData);
    const content = `${caption}\n\n${normalizeUrl(props.shareUrl)}`;
    await copyToClipboard(content);
  },
  getPreviewContent: () => {
    if (!prData.parsed) return "Loading...";
    const caption = generateXiaohongshuCaption(prData);
    return `${caption}\n\n${normalizeUrl(props.shareUrl)}`;
  },
},
```

**Caption template (no LLM needed for Phase 1):**

```typescript
function generateXiaohongshuCaption(prData: ParsedPartnerRequest): string {
  const { title, time, location, minParticipants, maxParticipants } = prData.parsed || {};
  
  return `✨ 周末搭子，走起！\n${title} | ${time} | ${location}\n还差${maxParticipants - minParticipants}人 🎉`;
}
```

**Props needed (from parent PRPage.vue):**

- `prData`: The parsed partner request object

---

### Phase 2: Enhanced Captions with LLM

**Backend API:**

```typescript
// apps/backend/src/controllers/llm.controller.ts
POST /api/llm/generate-xiaohongshu-caption
Request: ParsedPartnerRequest
Response: { caption: string }
```

**Frontend composable:**

```typescript
// apps/frontend/src/composables/useGenerateCopy.ts
const generateCaption = async (prData: ParsedPartnerRequest) => {
  // Call backend via RPC
  return await client.generateXiaohongshuCaption(prData);
};
```

**Component:**

```vue
<!-- ShareToXiaohongshu/CopyEditor.vue -->
- Textarea for editing generated caption
- 🔄 Regenerate button
- Loading state during LLM call
```

---

### Phase 3: Poster + App Scheme (Deferred)

**When poster service is ready:**

1. Implement `generatePoster()` function (external API or Canvas rendering)
2. Display poster in modal with long-press guidance
3. Implement `openXiaohongshu()` using URL scheme

---

## 🔗 Dependencies & Integration Points

### Required Props (from PRPage.vue → SharePR.vue)

```typescript
interface Props {
  shareUrl: string;
  prData: {
    parsed?: ParsedPartnerRequest;
    // ... other fields
  };
}
```

### LLM Integration (Phase 2)

- Use existing `LLMService` pattern in backend
- Similar to how `ConfigService` works
- Single Zod schema for input validation

### Styling

- Use existing design tokens (scss variables)
- Match SharePR.vue button styles
- Reuse `.carousel-header`, `.action-btn` patterns

---

## ✅ Validation Checklist

### Phase 1

- [ ] SharePR.vue modified with Xiaohongshu method
- [ ] Caption template generates correct format
- [ ] Carousel navigation works with new method
- [ ] Copy to clipboard works
- [ ] Preview content displays correctly
- [ ] State feedback (copied/error) works

### Phase 2

- [ ] Backend API created (`POST /api/llm/generate-xiaohongshu-caption`)
- [ ] Frontend composable created
- [ ] CopyEditor component works
- [ ] Loading state displays
- [ ] Regenerate button calls LLM

### Phase 3

- [ ] Poster generation function exists
- [ ] Modal displays poster
- [ ] Long-press guidance shown
- [ ] URL scheme opens Xiaohongshu app
- [ ] Fallback to web version when app not installed

---

## ⚠️ Known Limitations & Future Considerations

1. **H5 Limitations**: Cannot directly save images to gallery
   - Solution: Guide users to long-press and save manually

2. **LLM API Key**: Phase 2 requires backend to handle LLM calls
   - Current solution: Use existing LLMService pattern
   - No additional infrastructure needed

3. **URL Scheme**: Opening Xiaohongshu app requires:
   - Correct scheme: `xhsdiscover://`
   - Fallback to `https://www.xiaohongshu.com` if not installed
   - No native integration possible in H5

4. **Device Detection**: May need to detect iOS vs Android for optimal UX (Phase 3)

---

## 🚀 Recommended Execution Order

### Immediate (Phase 1)

1. ✅ Modify `SharePR.vue` - Add Xiaohongshu method with caption template
2. ✅ Test carousel and copy functionality
3. ✅ Ship to production (15 minutes, zero backend impact)

### Next Sprint (Phase 2)

1. Create backend `POST /api/llm/generate-xiaohongshu-caption` endpoint
2. Create `useGenerateCopy.ts` composable
3. Create `ShareToXiaohongshu/CopyEditor.vue` component
4. Integrate into SharePR.vue

### Future (Phase 3)

1. Poster generation service (partner with design/backend team)
2. App scheme and fallback handling
3. Analytics and tracking

---

## 📊 Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1 (MVP) | Very Low | No backend changes, isolated component |
| 2 (LLM) | Low | Uses existing LLMService pattern |
| 3 (Poster) | Medium | Depends on poster service availability |

---

## 💡 Recommendations

1. **Approve Phase 1 immediately** - It's 15 minutes with zero risk
2. **Do Phase 1 → Phase 2 in one session** - Both are frontend-focused
3. **Defer Phase 3** - Wait for poster service to be ready first
4. **Consider Analytics** - Track which share methods users prefer

---

## Questions for Review

1. Should we implement Phase 1, 2, or all three in this task?
2. For Phase 2, is the LLM API accessible from frontend (via backend proxy)?
3. For Phase 3, do we have a poster generation service ready?
4. Should we add analytics to track share method usage?
