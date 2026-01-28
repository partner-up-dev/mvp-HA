# Plan: Inline ShareToXiaohongshu and Make Content Preview Dynamic

## Objective

Refactor SharePR component to:

1. Inline the ShareToXiaohongshu modal content directly into SharePR (no modal overlay)
2. Make the Content Preview section use `<component :is>` pattern for dynamic rendering
3. Change ShareToXiaohongshu from a modal to an inline panel option

## Current State

- `SharePR.vue`: Carousel-based share method selector with a modal popup for Xiaohongshu
- `ShareToXiaohongshu/index.vue`: Modal component with tabs (editor, poster)
- Content Preview: Static text rendering of preview content
- Share methods include: "Copy Link" and "Share to Xiaohongshu" (opens modal)

## Observations

1. SharePR uses `<component :is="currentMethod.options" />` for optional method options
2. The Xiaohongshu method currently triggers a modal popup (`showXiaohongshuModal`)
3. ShareToXiaohongshu is a full-featured modal with its own state management
4. Preview section just renders `previewContent` as plain text

## Proposed Solution

### 1. Extend ShareMethod Interface

Each `ShareMethod` now provides three components:

- `options?: Component` - Method-specific options (e.g., refresh caption button)
- `previewContent: Component` - The preview area content
- `actions: Component` - Action buttons specific to this method

### 2. Inline ShareToXiaohongshu Content

- Convert `ShareToXiaohongshu/index.vue` from Modal to inline preview component
- Remove Modal wrapper, keep caption editor and poster display
- Rename to `ShareToXiaohongshu/PreviewContent.vue`
- Manages: `currentCaption`, `posterIsGenerating`, poster state
- Emits caption updates to parent

### 3. Create ShareAsLink Components (Organized Folder)

- `ShareAsLink/TextPreview.vue` - Simple text preview in `<pre>`
- `ShareAsLink/Actions.vue` - Single "Copy Link" button

### 4. Create ShareToXiaohongshu Sub-components

- `ShareToXiaohongshu/Options.vue` - Refresh caption button ("换一个")
- `ShareToXiaohongshu/PreviewContent.vue` - Caption display + poster display (inline)
- `ShareToXiaohongshu/Actions.vue` - Three buttons: 复制文案, 下载海报, 分享到小红书

### 5. Update SharePR Structure

```
SharePR
├── Carousel Header (method selector)
├── Options Section
│   └── <component :is="currentMethod.options" /> (optional)
├── Content Preview Section
│   └── <component :is="currentMethod.previewContent" />
└── Action Section
    └── <component :is="currentMethod.actions" />
```

### 6. Implementation Steps

#### Step 1: Create `ShareAsLink/TextPreview.vue`

- Props: `content` (text to display)
- Simple `<pre>` wrapper with styling

#### Step 2: Create `ShareAsLink/Actions.vue`

- Props: `onClick` (copy handler), `state` (idle|copied|error)
- Single button with state feedback

#### Step 3: Refactor `ShareToXiaohongshu/index.vue` → `PreviewContent.vue`

- Remove `<Modal>` wrapper
- Keep: caption editor + poster display side-by-side or stacked
- Props: `prData`, `shareUrl`
- Emits: `update:caption` when caption changes
- Exposes: method to get current caption, trigger poster generation

#### Step 4: Create `ShareToXiaohongshu/Options.vue`

- Button to refresh/generate new caption ("换一个")
- Props: `prData`, `onRefresh` callback
- Triggers caption regeneration

#### Step 5: Create `ShareToXiaohongshu/Actions.vue`

- Three buttons in layout: [copy caption] [download poster] [share to xiaohongshu]
- First two: outline style, same row
- Third: primary style
- Props: `currentCaption`, `posterRef`, `shareUrl`, `prData`
- Handles: copy, download, open app

#### Step 6: Update `SharePR.vue`

- Extend `ShareMethod` interface with `previewContent`, `actions`, and `options`
- Update COPY_LINK method to include all three components
- Update XIAOHONGSHU method to include all three components
- Replace hard-coded preview/action sections with dynamic components
- Remove `showXiaohongshuModal` ref
- Pass props to components as needed

## Benefits

- ✅ Inline preview editing - users see real-time caption + poster changes
- ✅ Self-contained share methods - each owns options, preview, and actions
- ✅ Extensible pattern - easy to add new share methods with custom workflows
- ✅ Dynamic action buttons - different methods can have different action UIs
- ✅ Real-time feedback - caption changes immediately update poster
- ✅ Flexible layouts - no modal constraints, full inline control

## Files to Modify

1. `apps/frontend/src/components/SharePR.vue` - Refactor to support options, preview, and actions components
2. `apps/frontend/src/components/ShareToXiaohongshu/index.vue` → `PreviewContent.vue` - Remove modal wrapper

## Files to Create

1. `apps/frontend/src/components/ShareAsLink/TextPreview.vue` - Text preview for copy link
2. `apps/frontend/src/components/ShareAsLink/Actions.vue` - Copy link action button
3. `apps/frontend/src/components/ShareToXiaohongshu/Options.vue` - Refresh caption button
4. `apps/frontend/src/components/ShareToXiaohongshu/PreviewContent.vue` - Inline caption + poster display
5. `apps/frontend/src/components/ShareToXiaohongshu/Actions.vue` - Three action buttons
