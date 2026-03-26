# L0 Plan — Documentation Diagnosis Decomposition

## Goal
Produce a high-confidence mismatch diagnosis between `docs/` and implementation, using small scoped diagnosis tracks.

## Decomposition Strategy

1. **Track A — PRD / Domain semantics**
   - Focus: `docs/10-prd/**`
   - Compare with: backend domain/entity status machine + frontend rendered state labels.

2. **Track B — Frontend interface contracts**
   - Focus: `docs/30-unit-tdd/frontend/interfaces.md`
   - Compare with: actual frontend router and page entrypoints.

3. **Track C — Backend interface contracts**
   - Focus: `docs/30-unit-tdd/backend/interfaces.md`
   - Compare with: mounted backend routes/controllers and operational endpoints.

4. **Track D — Synthesis and risk prioritization**
   - Consolidate findings with severity and follow-up guidance.

## Execution Order
A → B → C → D

## Deliverables
- Track-level plan files (`L1-*.md`)
- Updated `RESULT.md` with per-track outputs and prioritized defects.
