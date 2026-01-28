# Refactor SharePR to Method Components - Plan

## Goal

Refactor `SharePR.vue` so **each share method provides a single component** that internally wires:

- options (optional)
- content preview
- actions

`SharePR.vue` becomes only the **carousel host** (header + switching between method components).

## Key Observations (from exploration)

### SharePR is currently doing too much

- `SharePR.vue` defines a `shareMethods` registry that separately references `options`, `previewContent`, and `actions` components.
- The registry uses `Record<string, any>` props, which hides mismatches and violates the repo rule “no any”.
- `handleCaptionUpdate` tries to mutate `currentShareMethod.actionsProps` inside a computed array, which is fragile and not reactive in the intended way.

### Xiaohongshu wiring is currently inconsistent

- `ShareToXiaohongshu/Actions.vue` requires `posterRef` and `posterIsGenerating`, but `SharePR.vue` does not provide them.
- `Options.vue` can emit a new caption, but `PreviewContent.vue` does not accept a caption input, so the two can’t actually stay in sync.
- `Actions.vue` expects `PosterPreview` to expose `generatePoster`, but `PosterPreview.vue` currently does not `defineExpose()` it.

These issues are exactly what “method component owns wiring” will fix.

## Proposed Design

### 1) SharePR becomes a carousel host

`SharePR.vue` will:

- render the carousel header (`<`, label, `>`)
- keep `currentMethodIndex`
- render **one** component: `currentMethod.component`

Method registry becomes:

```ts
interface ShareMethod {
  id: 'COPY_LINK' | 'XIAOHONGSHU';
  label: string;
  component: Component;
}
```

### 2) Each method becomes a single “Method” component

Add:

- `apps/frontend/src/components/ShareAsLink/Method.vue`
- `apps/frontend/src/components/ShareToXiaohongshu/Method.vue`

Each method component owns:

- local state needed for its UI
- wiring between its internal options/preview/actions components

SharePR passes only:

- `shareUrl: string`
- `parsedPr?: ParsedPartnerRequest` (derived from `prData?.parsed`)

### 3) Make Xiaohongshu caption flow controlled & consistent

To allow `Options` (regen button) and `PreviewContent` (editor) to stay in sync:

- `ShareToXiaohongshu/Method.vue` will own `const caption = ref('')`.
- `ShareToXiaohongshu/Options.vue` continues to emit `update:caption`.
- `ShareToXiaohongshu/PreviewContent.vue` will be refactored to:
  - accept `caption: string`
  - emit `update:caption` when the user edits

This turns caption into a proper single source of truth.

### 4) Fix poster generation wiring (minimal but correct)

Refactor `ShareToXiaohongshu/Actions.vue` to not need `posterRef`.

New direction:

- `ShareToXiaohongshu/Method.vue` owns poster generation state via `useGeneratePoster()`.
- `Actions.vue` becomes callback-driven and only receives:
  - `currentCaption`
  - `shareUrl`
  - `prData`
  - `posterIsGenerating`
  - `onDownloadPoster: () => Promise<void>`

Poster preview becomes presentation-only:

- `ShareToXiaohongshu/PosterPreview.vue` renders `posterUrl` + `isGenerating` and does not run generation.
- `Method.vue` watches `caption` and calls `generatePoster(caption)` to update `posterUrl`.

### 5) Types: remove `any` completely

- `SharePR.vue` will no longer use `Record<string, any>`.
- Method components will have explicit prop types.
- `SharePR`’s `prData` prop will be **required** (it is always available when `PRPage.vue` renders SharePR).
- Remove duplicated `ParsedPartnerRequest` interfaces and import the shared types from `@partner-up-dev/backend`.

`SharePR` props become:

```ts
interface Props {
  shareUrl: string;
   prData: { parsed: ParsedPartnerRequest };
}
```

Also apply the same de-duplication to other components that re-declare the same shape (e.g. `PRCard.vue`).

## Step-by-step Implementation Plan

1. Create `ShareAsLink/Method.vue` that composes:
   - `ShareAsLink/TextPreview.vue`
   - `ShareAsLink/Actions.vue`
   and owns copy-to-clipboard + success/error state.

2. Create `ShareToXiaohongshu/Method.vue` that composes:
   - `ShareToXiaohongshu/Options.vue` (optional)
   - `ShareToXiaohongshu/PreviewContent.vue`
   - `ShareToXiaohongshu/Actions.vue`
   and owns `caption` + poster generation state.

3. Refactor `ShareToXiaohongshu/PreviewContent.vue` to be controlled:
   - add `caption` prop
   - emit `update:caption` on edits

4. Update `ShareToXiaohongshu/CaptionEditor.vue` to become a pure editor:
   - accept `modelValue` (or `caption`) and emit updates
   - remove its current “generate on mount” behavior (generation belongs in `Options.vue` / `Method.vue`).

5. Refactor `ShareToXiaohongshu/PosterPreview.vue` to be presentational-only and receive `posterUrl`/`isGenerating` from `Method.vue`.

6. Refactor `ShareToXiaohongshu/Actions.vue` to remove `posterRef` and use `onDownloadPoster()` + `posterIsGenerating`.

7. Refactor `SharePR.vue`:
   - replace 3-part registry (options/preview/actions) with `{ component }`
   - remove caption wiring / refs from SharePR

8. Update `apps/frontend/src/components/AGENTS.md` to describe the new architecture (SharePR = host; per-method components own wiring).

9. Validate:
   - `pnpm --filter @partner-up-dev/frontend typecheck` (or equivalent script)
   - `pnpm --filter @partner-up-dev/frontend dev` smoke test: PR page loads; link copy works; Xiaohongshu caption regen/edit/copy works.

## Open Question (needs your preference)

When `prData?.parsed` is missing (e.g., loading / parse failed), should the Xiaohongshu method:

- A) be hidden from the carousel entirely, or
- B) remain visible but show a disabled/empty state message?

(Default in implementation will be **B** unless you prefer A.)
