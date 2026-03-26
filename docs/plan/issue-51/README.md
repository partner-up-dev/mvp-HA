# Issue 51 Follow-up Repair Plan

## Scope

This plan addresses the unresolved follow-ups in issue comment:
- https://github.com/partner-up-dev/mvp-HA/issues/51#issuecomment-4118125129

Target issue:
- https://github.com/partner-up-dev/mvp-HA/issues/51

## Problem Statements to Close

1. Exit (`EXITED`) is shown as release (`RELEASED`) in some frontend copy.
2. Partner roster is not split into "current" and "history".
3. Rejoin currently creates a new partner row instead of reusing an existing row for the same user in the same PR.
4. "Participation overview" can visually duplicate users after exit and rejoin.

## Delivery Strategy

Because this has both behavior and data-model semantics, split into three implementation slices:

1. UI semantics and overview correctness (low risk)
2. Roster split (medium risk, mostly UI)
3. Rejoin row reuse (higher risk, domain behavior)

Each slice should be independently releasable and build-passable.

## Slice Files

- `01-ui-semantics-and-overview.md`
- `02-roster-current-vs-history.md`
- `03-rejoin-row-reuse.md`

## Global Acceptance Criteria

- Exit and release are never conflated in user-facing copy.
- Current participant indicators and summary numbers are based only on active states (`JOINED/CONFIRMED/ATTENDED`).
- History states are visible and clearly separated from current participants.
- A user rejoining the same PR reuses their existing partner row instead of creating another row.
- `pnpm build` passes.
