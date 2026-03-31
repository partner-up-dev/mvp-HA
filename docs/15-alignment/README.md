# Alignment Pack

## Purpose

- Provide shared naming and anchors for reference-sensitive edits.
- Reduce drift caused by ambiguous "this section" requests.

## When To Read

- UI changes or any edit where the target is ambiguous.
- Changes that need explicit scope/invariant boundaries.

## Canonical Target Formats

- Frontend: page > region > block > element > state
- Backend: bounded_context > service > module > endpoint > behavior
- Docs: document > section > subsection > block

## Contents

- change-request-template.md
- ui-map.yaml (partial map of hot surfaces)

## How To Extend

- Add only hot surfaces with repeated drift.
- Prefer stable anchors in code when ambiguity persists (data-page, data-region, test ids).
- Keep the map minimal; remove stale entries.

## Non-Goals

- Not product truth or technical design.
- Not a full UI inventory.
