# Legacy Doc Inventory for SVC v9.7 Alignment

## Purpose

This inventory separates "rewrite" and "delete" candidates so the cleanup phase does not collapse everything into one risky action.

## A. Active Files That Need Rewrite, Not Deletion

These files are still active entry points or durable indexes. They should be rewritten to v9.7 shape, not removed.

- `AGENTS.md`
- `apps/frontend/AGENTS.md`
- `apps/backend/AGENTS.md`
- `docs/10-prd/index.md`
- `docs/15-alignment/README.md`
- `docs/15-alignment/change-request-template.md`
- `docs/20-product-tdd/index.md`

Notes:

- `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md` is a special case. It probably needs splitting or demotion, not blind deletion.
- `docs/15-alignment/ui-map.yaml` is also a special case. It may survive as a small partial aid if still justified.

## B. High-Confidence Direct-Delete Candidate

These can be deleted directly.

- `docs/_svc_v91.md`

Reason:

- it is an old local framework snapshot
- it now competes with the external v9.7 source of truth in `F:/CODING/svc`

## C. High-Confidence Direct-Delete Candidates

These folders are strong legacy-history candidates because they record migration decisions that v9.7 now intentionally reverses or supersedes.

- `docs/task/align-svc-v9/`
- `docs/task/diagnose-doc-260326/`
- `docs/task/refactor-doc-system/`

Why they are sensitive:

- they contain prior justifications for removing `docs/00-meta/`
- they contain prior justifications for keeping `docs/task/`
- they still explain how the current repo shape happened

Recommended treatment:

- direct delete is acceptable for this task because the user explicitly deprioritized preserving historical task provenance
- rewrite any active references first, then remove the folders

## D. Broader Historical Task Packets

Current scale:

- 35 task folders
- 100 markdown files

Most of these are implementation history rather than active truth. They should remain non-authoritative after v9.7 cutover.

Recommended rule:

- new work goes to `tasks/`
- old `docs/task/` packets are deletion candidates, not archival candidates
- do not normalize them; remove them after active references are cleaned

## E. Known Old-Path Residue

Repo-wide scan counts over markdown / `AGENTS.md` files:

- `docs/product/`: 18 files
- `docs/00-meta`: 5 files
- `docs/task`: 14 files
- `vocabulary-and-lifecycle.md`: 4 files
- `Alignment Pack`: 2 files

Interpretation:

- not every old-path mention deserves manual cleanup
- active entry points should be cleaned first
- historical packets do not deserve normalization work if they are going to be deleted anyway

## F. Deletion Heuristic

Delete only when all are true:

1. the file is not an active entry point
2. a clearer replacement already exists
3. keeping it would mislead future reading more than it preserves useful history

Otherwise:

- rewrite if it is active truth
- delete if it is stale history and the active replacement already exists
