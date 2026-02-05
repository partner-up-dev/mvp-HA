# L0 Plan

## Minimal Requirements
- Add PartnerRequest status `EXPIRED` meaning "时间到自动结束" (auto-expire when time is reached).
- Ensure expired transition is automatic (not manual).

## Constraints
- No `any` in TypeScript.
- Use `async/await` over raw Promises.
- Use `pnpm` for scripts.
- Update docs that are outdated or inconsistent with the new state.

## Deliverables
- Implement `EXPIRED` state in code.
- Update relevant docs.
- Write L1/L2/L3 plans and `RESULT.md`.
