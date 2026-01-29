# Plan: Configurable Xiaohongshu Styles

## Overview

Transform the hardcoded Xiaohongshu style prompts into a configurable database-driven system where styles are stored as JSON array in the config table. The frontend will use a simple integer-based style switching mechanism without knowing the actual style names.

## Current State Analysis

### Hardcoded Style Implementation

- **Location**: `apps/backend/src/services/LLMService.ts`
- **Current styles**: 5 hardcoded styles (friendly, concise, warm, trendy, professional)
- **Frontend knows**: Style IDs, names, and cycles through them explicitly
- **Limitation**: Cannot add/remove/modify styles without code changes

### Current Config System

- **Storage**: Simple key-value text pairs in `config` table
- **Service**: Basic `getValueOrFallback()` method
- **Repository**: Simple text-based operations
- **Limitation**: No JSON/array support, no upsert operations

### Current Frontend Behavior

- **Style Management**: Maintains local array of styles with names
- **Cycling Logic**: Uses `currentStyleIndex` and modulo arithmetic
- **Caching**: Stores generated captions per style ID to avoid regeneration
- **UX**: Shows transitioning state when switching styles

## Proposed Solution

### Database Configuration

- **Config Key**: `xiaohongshu_style_prompts`
- **Value Format**: JSON string containing array of style prompt strings
- **Migration Strategy**: Seed database with current 5 styles as default

### Backend Changes

#### 1. Enhanced Config Service

- Add JSON parsing capabilities for array configs
- Add upsert method for config management  
- Add fallback to default styles if config missing/malformed
- Support for integer-based style indexing with wraparound

#### 2. Enhanced LLM Service

- Remove hardcoded `XIAOHONGSHU_STYLE_PROMPTS` constant
- Load styles dynamically from config database
- Change style parameter from `XiaohongshuStyle` enum to `number`
- Implement modulo logic for style index wraparound
- Maintain backward compatibility during transition

#### 3. API Changes  

- Update `llm.controller.ts` to accept integer style parameter
- Remove style enum validation, use number validation instead
- Update TypeScript types accordingly

### Frontend Changes

#### 1. Simplified Style Management

- Remove hardcoded `styles` array and `StyleOption` interface
- Remove style ID knowledge - frontend only tracks style index
- Simplify cycling logic - just increment the style number
- Remove style name display (or fetch from new endpoint if needed later)

#### 2. Updated Query Interface

- Change `useGenerateXiaohongshuCaption` to use integer style parameter
- Update caching key from style ID to style index
- Maintain existing UX behavior and transitions

#### 3. Component Simplification

- Remove `XiaohongshuStyle` import and type references
- Simplify `handleRegenerate()` logic to just increment index
- Update caching mechanism to use numeric keys

### Migration Strategy

#### Phase 1: Backward Compatible Backend

1. Enhance ConfigService with JSON support
2. Update LLMService to support both old enum and new integer style params
3. Seed database with current styles in JSON format
4. Deploy backend changes

#### Phase 2: Frontend Migration  

1. Update frontend to use integer-based style switching
2. Remove hardcoded style arrays and enums
3. Test style cycling and caching functionality  
4. Deploy frontend changes

#### Phase 3: Cleanup

1. Remove enum-based style support from backend
2. Remove old hardcoded style constants
3. Update TypeScript types to remove legacy enums

## Technical Implementation Details

### Database Schema (No Changes Required)

```sql
-- Existing config table structure
CREATE TABLE "config" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);
```

### Config Data Format

```json
{
  "key": "xiaohongshu_style_prompts",
  "value": "[\"你是一位小红书文案写手，专长于撰写有分享力的搭子合伙文案。\\n\\n写作要求：\\n- 一句话，不超过50个字\\n- 口语化、有亲和力、有感染力\\n- 可以适当使用1-2个emoji表情\\n- 必须包含核心信息：做什么、什么时间、在哪、还差几人\\n- 风格要活泼、友好，让人有参与的欲望\\n\\n输出只包含文案内容，不要其他解释。\", \"你是一位简洁高效的文案写手，专注于快速传达核心信息。\\n\\n写作要求：\\n- 一句话，不超过40个字\\n- 直接明了，重点突出\\n- 包含核心信息：做什么、什么时间、在哪、还差几人\\n- 风格简洁干练，适合商务和学习场景\\n\\n输出只包含文案内容，不要其他解释。\", \"你是一位温暖治愈的文案写手，善于营造温馨共情的氛围。\\n\\n写作要求：\\n- 一句话，不超过50个字\\n- 温暖有爱，充满关怀\\n- 可以适当使用温馨的emoji表情\\n- 包含核心信息：做什么、什么时间、在哪、还差几人\\n- 风格温暖治愈，让人感受到陪伴和支持\\n\\n输出只包含文案内容，不要其他解释。\", \"你是一位潮流文案写手，精通年轻人的表达方式和网络文化。\\n\\n写作要求：\\n- 一句话，不超过50个字\\n- 使用潮流网络用语和emoji\\n- 充满活力和时尚感\\n- 包含核心信息：做什么、什么时间、在哪、还差几人\\n- 风格年轻酷炫，适合潮流和创新活动\\n\\n输出只包含文案内容，不要其他解释。\", \"你是一位专业正式的文案写手，专长于商务和专业场景的表达。\\n\\n写作要求：\\n- 一句话，不超过45个字\\n- 正式专业，值得信赖\\n- 措辞严谨，信息准确\\n- 包含核心信息：做什么、什么时间、在哪、还差几人\\n- 风格专业正式，适合行业交流和技能分享\\n\\n输出只包含文案内容，不要其他解释。\"]"
}
```

### Enhanced ConfigService Interface

```typescript
export class ConfigService {
  // Existing method
  async getValueOrFallback(key: string, fallback: string): Promise<string>
  
  // New methods
  async getJsonArrayOrFallback(key: string, fallback: string[]): Promise<string[]>
  async upsertConfig(key: string, value: string): Promise<void>
}
```

### Updated LLMService Interface  

```typescript
export class LLMService {
  // Updated method signature
  async generateXiaohongshuCaption(
    prData: ParsedPartnerRequest,
    styleIndex?: number, // Changed from XiaohongshuStyle to number
  ): Promise<string>
  
  // New private methods
  private async getXiaohongshuStylePrompts(): Promise<string[]>
  private selectStyleByIndex(styles: string[], index?: number): string
}
```

### Updated API Schema

```typescript
// In llm.controller.ts
const generateCaptionSchema = parsedPRSchema.extend({
  styleIndex: z.number().int().min(0).optional(), // Changed from style enum
});
```

### Simplified Frontend Interface

```typescript
// Simplified component state
const currentStyleIndex = ref(0);
const generatedCaptions = ref<Map<number, string>>(new Map()); // Changed key type

// Simplified regeneration logic  
const handleRegenerate = async () => {
  isTransitioning.value = true;
  currentStyleIndex.value = currentStyleIndex.value + 1; // Backend handles wraparound
  
  let newCaption: string;
  
  if (generatedCaptions.value.has(currentStyleIndex.value)) {
    newCaption = generatedCaptions.value.get(currentStyleIndex.value)!;
  } else {
    newCaption = await generateCaptionAsync({
      prData: props.prData,
      styleIndex: currentStyleIndex.value,
    });
    generatedCaptions.value.set(currentStyleIndex.value, newCaption);
  }
  
  setTimeout(() => {
    caption.value = newCaption;
    isTransitioning.value = false;
  }, 150);
};
```

## Benefits of This Approach

### 1. Dynamic Configuration

- Styles can be added/removed/modified through database without code changes
- Different environments can have different style sets
- A/B testing of different prompts becomes possible

### 2. Simplified Frontend

- Frontend no longer needs to know about style names or IDs
- Reduced coupling between frontend and backend style definitions
- Simpler state management and caching logic

### 3. Backend Flexibility

- Automatic wraparound handling for style indices
- Easy fallback to default styles if config is missing
- Maintains existing UX behavior while adding flexibility

### 4. Future Extensibility

- Can easily add style metadata (names, descriptions) later if needed
- Can support different style sets per user/organization
- Can add admin interface for style management

## Risks and Considerations

### 1. Data Integrity

- **Risk**: Malformed JSON in config could break style generation
- **Mitigation**: Robust JSON parsing with fallback to defaults
- **Validation**: Schema validation for style prompt arrays

### 2. Migration Complexity  

- **Risk**: Temporary inconsistency between frontend and backend during deployment
- **Mitigation**: Backward compatible implementation with gradual migration
- **Testing**: Thorough testing of both old and new style mechanisms

### 3. Cache Invalidation

- **Risk**: Frontend cache becomes stale when styles change in database
- **Mitigation**: Document that style changes require cache clearing, or implement cache versioning later
- **Future Enhancement**: Add cache busting mechanism

### 4. Index Bounds Handling

- **Risk**: Frontend may send invalid style indices
- **Mitigation**: Backend implements modulo wraparound logic
- **Validation**: Ensure style arrays are never empty

## Success Criteria

### 1. Functional Requirements

- [ ] Styles can be configured through database JSON array
- [ ] Frontend uses integer-based style switching without knowing style details
- [ ] Style cycling works seamlessly with automatic wraparound  
- [ ] Existing UX behavior (caching, transitions) is preserved
- [ ] Graceful fallback to default styles if config is missing

### 2. Non-Functional Requirements  

- [ ] No breaking changes to existing API during migration
- [ ] Performance equivalent to current hardcoded implementation
- [ ] Clean separation between frontend style cycling and backend style management
- [ ] Maintainable code with clear responsibilities

### 3. Quality Assurance

- [ ] All existing style generation tests pass
- [ ] New tests for config-based style loading
- [ ] Frontend tests for integer-based style cycling
- [ ] Error handling tests for malformed config data
- [ ] Integration tests for end-to-end style generation workflow

## Implementation Steps

### Phase 1: Backend Infrastructure (Est. 4-6 hours)

1. **Enhance ConfigService** (2h)
   - Add JSON array parsing method
   - Add config upsert functionality
   - Add comprehensive error handling and logging

2. **Update LLMService** (2h)  
   - Add dynamic style loading from config
   - Implement integer-based style selection with wraparound
   - Maintain backward compatibility with existing enum-based API

3. **Database Migration** (1h)
   - Create migration to seed `xiaohongshu_style_prompts` config
   - Migrate current 5 hardcoded styles to JSON array format

4. **Testing** (1h)
   - Unit tests for new ConfigService methods
   - Unit tests for updated LLMService style selection
   - Integration tests for config-based style generation

### Phase 2: API Migration (Est. 2-3 hours)

1. **Update Controller** (1h)
   - Modify API schema to accept integer styleIndex parameter
   - Update validation and error handling
   - Maintain backward compatibility during transition

2. **Update Types** (1h)
   - Update TypeScript interfaces and types
   - Remove deprecated XiaohongshuStyle enum references
   - Update API documentation

3. **Testing** (1h)
   - API endpoint tests with new integer parameter
   - Backward compatibility tests with old enum parameter
   - Error handling tests for invalid style indices

### Phase 3: Frontend Migration (Est. 3-4 hours)  

1. **Update Query Hook** (1h)
   - Modify `useGenerateXiaohongshuCaption` to use integer parameter
   - Update TypeScript types and interfaces
   - Test query functionality with new API

2. **Simplify Components** (2h)
   - Remove hardcoded styles array from Method.vue  
   - Update style cycling logic to use simple incrementation
   - Update caching mechanism to use numeric keys
   - Test UI behavior and transitions

3. **Testing** (1h)
   - Component tests for integer-based style cycling  
   - Integration tests for caption generation workflow
   - Manual testing of style switching and caching behavior

### Phase 4: Cleanup & Polish (Est. 1-2 hours)

1. **Remove Legacy Code** (1h)
   - Remove hardcoded XIAOHONGSHU_STYLE_PROMPTS constant
   - Remove XiaohongshuStyle enum and related types
   - Clean up unused imports and type references

2. **Documentation** (1h)
   - Update AGENTS.md files with new configuration approach
   - Document config key format and validation requirements
   - Add migration notes and troubleshooting guide

## Alternative Approaches Considered

### 1. Keep Style Names in Frontend

- **Pro**: Frontend could show style names to users
- **Con**: Requires additional API endpoint to fetch style metadata
- **Decision**: YAGNI - not needed for current requirements

### 2. Use Style IDs Instead of Indices

- **Pro**: More explicit, could be more stable across config changes
- **Con**: Requires frontend to know about backend ID scheme  
- **Decision**: Index-based approach simpler and meets requirements

### 3. Store Styles as Separate Config Entries

- **Pro**: Easier individual style management
- **Con**: More complex to maintain ordering and ensure atomicity
- **Decision**: Single JSON array provides better atomicity and simpler management

## Future Enhancement Opportunities

1. **Admin Interface**: Web UI for managing xiaohongshu styles
2. **Style Metadata**: Add names, descriptions, tags for styles  
3. **User Preferences**: Allow users to favorite or disable certain styles
4. **A/B Testing**: Framework for testing different style combinations
5. **Analytics**: Track style effectiveness and user preferences
6. **Localization**: Support for multiple language style sets

This plan provides a comprehensive path to implement configurable xiaohongshu styles while maintaining system stability and user experience.
