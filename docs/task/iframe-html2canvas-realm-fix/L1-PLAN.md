# L1 Plan — High-level solution

## Root Cause (most likely)

Elements created inside an iframe belong to the iframe’s JavaScript realm.

- `doc.body` is an `HTMLBodyElement`, but `doc.body instanceof HTMLElement` can be **false** when `HTMLElement` is from the parent window.
- Same issue can affect `posterRoot instanceof HTMLElement` and `firstElementChild instanceof HTMLElement`.

This makes `pickRenderRoot` incorrectly think “body not available”.

## Approach

- Replace cross-realm `instanceof HTMLElement` checks with realm-aware checks using `doc.defaultView.HTMLElement`.
- Update `waitForBody` to use the same realm-aware check, and throw on timeout (so failures are explicit and consistent).
- Keep everything else (CSP injection, deny-list validation, iframe sandboxing, html2canvas config) unchanged.

## Expected Impact

- Removes false-negative body detection.
- Stabilizes HTML poster rendering; fallback should only trigger on real rendering failures.

## Out of Scope

- Changing LLM HTML prompts.
- Reworking the sandbox/CSP model.
