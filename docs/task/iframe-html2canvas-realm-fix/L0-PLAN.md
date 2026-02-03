# L0 Plan — Fix `iframe body not available` in HTML poster renderer

## Problem

Xiaohongshu HTML poster rendering sometimes fails and falls back to the template with:

- `Error: iframe body not available`
- stack: `pickRenderRoot` → `renderPosterHtmlToBlob`

## Constraints / Requirements

- Keep the existing sandboxed iframe + `html2canvas` approach.
- Avoid introducing `any`; keep TypeScript strictness.
- Fix should be robust across browsers (including embedded WebViews).
- Preserve existing fallback-to-template behavior for genuine failures.

## Success Criteria

- `renderPosterHtmlToBlob` can reliably find a render root in the iframe without false negatives.
- No runtime errors from cross-document `instanceof` checks.
