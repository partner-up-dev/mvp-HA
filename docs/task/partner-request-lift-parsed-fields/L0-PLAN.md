# L0 Plan

Task: Refactor partner request by lifting parsed fields to top-level `PartnerRequest` and adjusting core fields.

Constraints:
- No `any` usage.
- Use async/await.
- Update relevant `AGENTS.md` docs as code changes are made.
- Use pnpm for scripts.
- No backward compatibility; remove `parsed` from API contracts.

Clarifications/Assumptions:
- DB migration strategy: drop and recreate `partner_requests` table (dev stage reset).
- Field changes:
  - `scenario` renamed to `type`.
  - `time` is a window: `[string, string]`.
  - `participants` renamed to `partners` with `[min, current, max]` tuple.
  - `partners` tuple replaces previous min/max participants fields.
