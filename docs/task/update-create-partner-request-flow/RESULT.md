# Result

## Task
Update create partner request flow:
- Home page CTA + NL expandable entry
- Shared structured form component
- Introduce vee-validate for structured form
- API split for structured/NL create
- Remove mock RPC path

## Implemented

### Backend
- Added `DRAFT` status support.
- Split create endpoints:
  - `POST /api/pr` for structured create (`fields`, `pin`, `status: DRAFT|OPEN`)
  - `POST /api/pr/natural_language` for NL create (`rawText`, `pin`, `nowIso`)
- Added NL word limit validation (`<= 50` words).
- Added structured create service path with normalized partners current count (`0`).
- Allowed content editing for `OPEN` and `DRAFT`.
- Normalized `getPR` response `title` to optional string (`undefined` instead of `null`) for frontend compatibility.

### Frontend
- Rebuilt validation module with centralized schemas and `vee-validate` typed schemas.
- Added shared `PartnerRequestForm.vue` (structured fields + PIN, no action buttons).
- Added standalone `NLPRForm.vue` for home NL creation flow.
- Added new page `PRCreatePage.vue` (`/pr/new`) with footer actions:
  - `保存` -> create as `DRAFT`
  - `创建` -> create as `OPEN`
- Refactored `EditContentModal.vue` to reuse `PartnerRequestForm`.
- Refactored `HomePage.vue` to two equal-level rows:
  - `找搭子一起 <轮换主题>` -> navigate to `/pr/new`
  - `刚刚我已经在群里发过了？` -> toggle NL form expansion
- Updated status badge to include `DRAFT`.
- Removed mock RPC implementation and runtime switching (`VITE_USE_MOCK` path removed).

## Key Files Changed
- Backend:
  - `apps/backend/src/entities/partner-request.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/backend/src/services/PartnerRequestService.ts`
  - `apps/backend/src/services/ShareService.ts`
  - `apps/backend/src/services/LLMService.ts`
  - `apps/backend/src/index.ts`
- Frontend:
  - `apps/frontend/src/lib/validation.ts`
  - `apps/frontend/src/lib/rpc.ts`
  - `apps/frontend/src/queries/useCreatePR.ts`
  - `apps/frontend/src/components/PartnerRequestForm.vue`
  - `apps/frontend/src/components/NLPRForm.vue`
  - `apps/frontend/src/components/EditContentModal.vue`
  - `apps/frontend/src/components/StatusBadge.vue`
  - `apps/frontend/src/pages/HomePage.vue`
  - `apps/frontend/src/pages/PRCreatePage.vue`
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/router/index.ts`
  - Removed: `apps/frontend/src/lib/mock-rpc.ts`
- Documentation:
  - `AGENTS.md`
  - `apps/frontend/AGENTS.md`
  - `apps/backend/AGENTS.md`

## Verification Performed
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.

## E2E / BDD Note
- No existing E2E/BDD test framework or scripts were found in this repository at implementation time.
- Mock transport was removed; app now runs only against real backend RPC endpoints.
