# Plan: ShareToXiaohongshu Polish

The goal is to improve the poster loading experience in the `ShareToXiaohongshu` component, addressing the issue where it can take more than 10 seconds.

## Approach

1. **Cache Generated Posters**: Currently, switching between styles regenerates the poster every time. We will cache the `posterUrl` locally in the component state so that revisiting a style shows the poster immediately.
2. **Remove Artificial Delays**: The current implementation has a hardcoded 1.5s delay (`POSTER_GENERATION_DELAY`) to "show placeholder longer". This is unnecessary and hurts performance, especially when generation is already slow.
3. **Improve Loading State**: Instead of replacing the poster with a blank placeholder during generation, we will keep the *previous* poster visible with a loading overlay. This provides better visual continuity.

## Implementation Details

### `ShareToXiaohongshu.vue`

1. **Update State**:
    - Modify `generatedCaptions` map value type to include optional `posterUrl` (string).
    - `Map<number, { caption: string; posterStylePrompt: string; posterUrl?: string }>`
2. **Update `generatePosterForCurrentCaption`**:
    - Check if `generatedCaptions` has a stored `posterUrl` for the current `captionCounter`. If so, use it immediately and skip generation.
    - Remove `await delayMs(TIMING_CONSTANTS.POSTER_GENERATION_DELAY)`.
    - After successful generation, update the `generatedCaptions` entry with the new `posterUrl`.
3. **Update `handleRegenerate`**:
    - Ensure it properly retrieves cached captions and posters.
4. **UI Logic**:
    - Modify the template logic to allow showing the *old* poster (if available) while `posterIsGenerating` is true.
    - Add a loading overlay on top of the old poster in this state.

### `ShareToXiaohongshu.scss`

1. Add styles for the loading overlay (e.g., semi-transparent background with a spinner centered over the poster image).

### `ShareToXiaohongshu.ts`

1. Remove `POSTER_GENERATION_DELAY` from `TIMING_CONSTANTS` or set it to 0.

## User Actions

- None required.

## Verification

- Verify that switching back to a previous caption loads the poster instantly.
- Verify that generating a new poster feels faster (no 1.5s extra delay).
- Verify the visual transition (overlay vs blank placeholder).
