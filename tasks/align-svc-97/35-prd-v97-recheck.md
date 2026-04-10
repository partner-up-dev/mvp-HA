# PRD Recheck Against SVC v9.7

## Scope

This recheck covers the active PRD and immediately adjacent active docs after the English rewrite:

- `docs/10-prd/*`
- `docs/20-product-tdd/claim-realization-matrix.md`
- backend local `AGENTS.md` files that still contained non-English or stale guidance

It does not reassess legacy `docs/task/*` history, because those packets are already on the delete path.

## Language Rule Result

Requested rule:

- all docs must be written in English
- only glossary / term preservation may keep Chinese

Current result:

- active PRD files are now written in English
- active Product TDD claim matrix is now written in English
- active backend local AGENTS previously containing Chinese are now written in English
- the only Chinese left in active docs is the term column inside `docs/10-prd/glossary.md`

## PRD Alignment Improvements Made

### 1. Glossary ownership is now aligned

Before:

- business vocabulary lived in `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`

After:

- `docs/10-prd/glossary.md` is now the business vocabulary owner
- the mixed `vocabulary-and-lifecycle.md` file was removed
- lifecycle semantics were moved into `behavior/rules-and-invariants.md`

### 2. PRD language and layer purity improved

Before:

- the whole PRD tree was primarily Chinese
- one driver file mixed product reality with documentation-system migration state

After:

- PRD is now written in English
- `operational-realities.md` no longer talks about old/new doc systems or unfinished doc migration
- the product layer now talks about product-operational realities only

### 3. Claims are closer to the v9.7 claim-centered model

Before:

- `behavior/claims.md` only stated claims and short consequence bullets

After:

- each claim now includes:
  - Claim Intent
  - Evaluation Dimensions
  - Evidence Expectation
  - Source Rationale
  - Realization Pointers

This is materially closer to the SVC v9.7 PRD section guidance.

### 4. Domain structure is cleaner

Before:

- domain structure mixed glossary and lifecycle into the same file

After:

- `domain-structure/` now contains only:
  - `derived-boundaries.md`
  - `cross-domain-interactions.md`

This matches the SVC v9.7 file-shape guidance much better.

## Remaining PRD-Adjacent Gaps

These are still open after the rewrite:

1. `docs/15-alignment/*` is still pre-v9.7 and still framed as `Alignment Pack`.
2. `docs/20-product-tdd/index.md` and some neighboring active docs still reference the older alignment naming and surrounding model.
3. Legacy `docs/task/*` still exists physically, even though active guidance no longer routes there.
4. `docs/_svc_v91.md` still exists physically and still competes with the live external v9.7 framework source.

## Current Judgment

PRD alignment is now materially better and no longer one of the highest-drift active layers.

The main remaining repo-level blockers are:

- alignment substrate rewrite
- stale framework mirror deletion
- legacy task-packet deletion

That means the next highest-value slice should move from PRD into alignment and cleanup rather than staying stuck on product-layer rewrite.
