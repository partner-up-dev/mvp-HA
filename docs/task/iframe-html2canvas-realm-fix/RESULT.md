# RESULT — Fix iframe realm `instanceof` crash in HTML poster renderer

## Outcome

- Fixed intermittent failures in client-side HTML poster rendering where `renderPosterHtmlToBlob` fell back with `Error: iframe body not available`.
- Root cause addressed: cross-iframe `instanceof HTMLElement` checks can fail because iframe nodes live in a different JS realm.

## What Changed

- Updated [apps/frontend/src/composables/renderHtmlPoster.ts](apps/frontend/src/composables/renderHtmlPoster.ts)
  - Added realm-aware helpers using `doc.defaultView.HTMLElement`.
  - Replaced all iframe-node `instanceof HTMLElement` checks with `isHTMLElementInDoc(doc, node)`.
  - Made `waitForBody` throw on timeout (keeps failure explicit and consistent).

## Validation

- Frontend build/typecheck:
  - `pnpm --filter @partner-up-dev/frontend build`

## Notes

- Fallback-to-template remains intact for genuine render failures (invalid HTML, html2canvas errors, etc.).
