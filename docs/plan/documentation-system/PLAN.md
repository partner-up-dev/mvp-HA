# Plan: Documentation System Setup

Goal: Establish a lightweight documentation structure that supports fast iteration from PRD to code implementation, aligned with the requested product-layer vs repo-layer split.

## Scope

- Create `docs/product/` structure with `overview.md`, `features/` docs, and `glossary.md`.
- Define a minimal template for feature docs: user stories, flow, acceptance criteria, and involved surfaces (H5/backend/mini-program/etc.).
- Confirm or update repo-level `AGENTS.md` files to reflect the new documentation workflow if needed.
- Keep process documentation minimal; treat code as source of truth.

## Approach

1. Audit existing docs and AGENTS to avoid conflicts and keep consistency.
2. Create `docs/product/` structure and seed initial content:
   - `overview.md`
   - `features/share-to-xhs.md`
   - `features/find-partner.md`
   - `glossary.md`
3. Update repo-level `AGENTS.md` files only if they are missing or inconsistent with the new documentation workflow.
4. Verify documentation paths and references (no broken paths; minimal, clear content).

## Deliverables

- `docs/product/overview.md`
- `docs/product/features/share-to-xhs.md`
- `docs/product/features/find-partner.md`
- `docs/product/glossary.md`
- Any necessary updates to `AGENTS.md` files

## Verification

- `docs/product/` tree exists with required files.
- Feature docs contain only the required sections.
- Any AGENTS updates are consistent and limited to documentation workflow context.
