# Task Packet - Admin PR Delete

## Objective & Hypothesis

- Objective & Hypothesis: let admins hard-delete a PR from PR Admin, with the related Partner rows and PR support-resource rows removed in the same database operation. Hypothesis: deleting the canonical `partner_requests` root row can rely on existing `on delete cascade` constraints for PR-owned child rows while the admin use case keeps authorization, existence checks, cache refresh, and operator confirmation explicit.

## Guardrails Touched

- Typed input: Intent.
- Durable owner: PR Admin capability over canonical `PartnerRequest`.
- Backend surfaces:
  - `DELETE /api/admin/prs/:id`
  - `admin-anchor-management` use case and route exports
  - `PartnerRequestRepository` root deletion helper
- Frontend surfaces:
  - Admin PR management query mutation
  - `AdminPRPage` destructive action and confirmation dialog
- Product / contract docs:
  - Admin operator workflow truth
  - Stable admin route/API coordination shape

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `pnpm --filter @partner-up-dev/backend test:scenario` passed after loading `apps/backend/.env` into the shell environment.
- Added scenario coverage for Admin PR delete cascade.
