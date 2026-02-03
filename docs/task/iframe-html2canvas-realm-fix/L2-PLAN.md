# L2 Plan — Low-level design

## Target

Fix false negatives in [apps/frontend/src/composables/renderHtmlPoster.ts](apps/frontend/src/composables/renderHtmlPoster.ts) where `instanceof HTMLElement` fails for nodes from an iframe.

## Key idea: realm-aware type guard

Add a small helper:

- `getHTMLElementCtor(doc): typeof HTMLElement | null`
- `isHTMLElementInDoc(doc, node): node is HTMLElement`

Implementation detail:

- Use `doc.defaultView?.HTMLElement` as the constructor for `instanceof`.
- Return `false` if `doc.defaultView` is null.

## Code changes

1. In `pickRenderRoot(doc, width, height)`
   - Replace `posterRoot instanceof HTMLElement` with `isHTMLElementInDoc(doc, posterRoot)`.
   - Replace `doc.body instanceof HTMLElement` with `isHTMLElementInDoc(doc, doc.body)`.
   - Replace `singleChild instanceof HTMLElement` with `isHTMLElementInDoc(doc, singleChild)`.

2. In `waitForBody(doc, timeoutMs)`
   - Loop until `isHTMLElementInDoc(doc, doc.body)`.
   - If timeout hits, throw `new Error("iframe body not available")` (to keep error messaging consistent).

## Non-goals

- No change to sandbox policy unless this fix proves insufficient.
- No change to deny-list / CSP unless required.

## Risks

- Some embedded webviews might have `doc.defaultView === null` briefly; guard handles this by continuing to wait until it becomes available.
