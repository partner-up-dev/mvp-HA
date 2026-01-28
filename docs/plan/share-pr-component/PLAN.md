# SharePR Component Implementation Plan

## Overview

Enhance the share feature in PRPage.vue by creating a new `SharePR` **inline component** (not modal) that appears below the actions section. It features carousel-style navigation to switch between share targets with a content preview. Currently only "copy link" is supported, but the architecture is extensible for future targets (WeChat, Xiaohongshu, etc.).

## Observations from Exploration

1. **Current Implementation**:
   - `ShareButton.vue` is a simple button that copies link or uses native Web Share API
   - Located inline in the actions section of PRPage.vue
   - No support for multiple share methods/targets

2. **Project Patterns**:
   - Components use design tokens (CSS variables) via mixins: `@include mx.pu-font()`, `@include mx.pu-elevation()`
   - Inline state management with `ref()` for visibility toggles
   - EditContentModal and ModifyStatusModal show state management patterns in parent

3. **Design System Available**:
   - CSS Variables: colors, spacing, radius, shadows
   - Mixins: `pu-font`, `pu-elevation`, `pu-icon`

4. **Styling Constraints**:
   - Must use design tokens only, no hardcoded values
   - Auto-injected mixins via Vite config
   - Responsive design for mobile

## Proposed Design

```ascii
┌────────────────────────────────────┐
│  <   复制链接 (Copy Link)   >      │  (Carousel header with nav buttons)
│                                    │
│  (Options section if method has    │
│   options - empty for copy link)   │
│                                    │
│  ┌────────────────────────────┐   │
│  │  将复制的内容              │   │  (Content Preview)
│  │  ━━━━━━━━━━━━━━━━━━━━    │   │
│  │  https://partnerup.        │   │  (For copy link: show URL)
│  │  com/pr/123                │   │  (For other methods: show)
│  │                            │   │  (formatted share content)
│  └────────────────────────────┘   │
│                                    │
│  [复制链接]   [已复制/失败提示]    │  (Action button + state feedback)
│                                    │
└────────────────────────────────────┘
```

## Component Structure

### SharePR.vue

- **Props**:
  - `prData` - full PR data for preview (title, parsed fields)
  - `shareUrl: string` - URL to share

- **Data/State**:
  - `currentMethodIndex: number` - active share method (for carousel)
  - `shareState: 'idle' | 'copied' | 'error'` - feedback state
  - `shareMethods: ShareMethod[]` - array of available methods

- **Computed**:
  - `currentMethod: ShareMethod` - current active method
  - `hasOptions: boolean` - whether current method has options section
  - `actionLabel: string` - button label based on state

- **Methods**:
  - `goToMethod(index)` - navigate carousel
  - `goToPrevMethod()` / `goToNextMethod()` - carousel buttons
  - `handleShare()` - execute share action for current method
  - `copyToClipboard(text)` - copy utility (reuse from ShareButton)
  - `flashState(state)` - show feedback then reset

- **Share Method Structure**:

  ```typescript
  interface ShareMethod {
    id: string;           // 'COPY_LINK', 'WECHAT', 'XIAOHONGSHU'
    label: string;        // '复制链接', '分享到微信'
    options?: Component;  // Optional options panel
    action: () => Promise<void>;
    getPreviewContent: () => string; // Returns content to display in preview
  }
  ```
  
  **For "copy link" method**: `getPreviewContent()` returns the URL string
  
  **For future methods**: `getPreviewContent()` returns formatted share text (e.g., title + URL for WeChat)

### PRPage.vue Changes

- Remove inline `ShareButton` from actions section
- Add `<SharePR>` component after actions section
- Pass `prData` and `shareUrl` props to SharePR

## Implementation Steps

1. **Create SharePR.vue component**:
   - Carousel header with `<` and `>` navigation buttons
   - Options section placeholder (render method.options if exists)
   - Content preview section (simplified from PRCard)
   - Action button with state feedback (copied/error)
   - Design token-based styling

2. **Update PRPage.vue**:
   - Remove inline ShareButton from actions
   - Add SharePR component below actions
   - Pass required props

3. **Type Safety**:
   - Define `ShareMethod` interface for extensibility
   - Use existing PR types from backend
   - Leverage TypeScript inference from RPC

4. **Reusable Utilities**:
   - Extract `copyToClipboard()` utility from ShareButton.vue for reuse
   - Create shareMethod registry/factory for adding new methods

## Design Decisions

1. **Inline Component vs Modal**: Inline because:
   - Simpler UX flow (no modal layer)
   - Seamless integration below actions
   - Natural scrolling on mobile
   - Still supports future complex share methods

2. **Carousel Navigation**: `<` and `>` buttons for:
   - Clear visual navigation between methods
   - Mobile-friendly touch targets
   - Extensible design (add more methods later)

3. **Preview Section**: Shows content that will be shared
   - **Copy Link method**: Display the URL in a code-like box (monospace font)
   - **Future methods**: Display formatted share content (e.g., title + description + URL for social media)
   - Preview is method-specific via `getPreviewContent()`

4. **Feedback**: Visual state (已复制/分享失败) with 2-second auto-reset

## Future Extensibility

- Add new share methods by extending `shareMethods` array
- Each method can have:
  - Custom options panel (e.g., WeChat config)
  - Custom action handler (e.g., API call)
  - Custom preview customization (e.g., image generation for Xiaohongshu)
- Method registry can be centralized for easy management
