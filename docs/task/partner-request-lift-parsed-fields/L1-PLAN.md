# L1 Plan (High-Level Solution)

Goal: Replace nested `parsed` JSON storage and API fields with explicit top-level PartnerRequest fields across backend, database, and frontend, while aligning new field definitions.

Architecture/Design Decisions:
- Database: drop and recreate `partner_requests` with explicit columns for all top-level fields. No `parsed` JSONB column.
- Core field changes:
  - `scenario` -> `type`.
  - `time` as `[string, string]` time window.
  - `participants` -> `partners` with tuple `[min, current, max]` (replaces min/max participants fields).
- Backend entities: remove `ParsedPartnerRequest`; define PartnerRequest fields directly in schema/validation.
- API contracts: request/response shapes use top-level fields only. Remove `parsed` from validators and return types.
- Service logic: update all `parsed.*` logic to use top-level fields; participants logic uses `partners` tuple.
- Frontend: update queries, components, forms, and mocks to use top-level fields; align validation schemas.

Primary Work Areas:
- Backend schema: `apps/backend/src/entities/partner-request.ts`
- Backend repos/services/controllers: `apps/backend/src/repositories/PartnerRequestRepository.ts`, `apps/backend/src/services/PartnerRequestService.ts`, `apps/backend/src/controllers/partner-request.controller.ts`, `apps/backend/src/index.ts`
- Frontend validation: `apps/frontend/src/lib/validation.ts`
- Frontend components/pages/queries/mocks: `apps/frontend/src/pages/PRPage.vue`, `apps/frontend/src/components/*`, `apps/frontend/src/queries/*`, `apps/frontend/src/lib/mock-rpc.ts`
- Docs: `AGENTS.md`, `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md` updates to reflect the new top-level PR fields and renamed concepts.

Dependencies/Prereqs:
- Confirm migration mechanism; will drop/recreate table in L2 plan.

Risks:
- Breaking API/FE types due to removal of `parsed` and renamed fields.
- Tuple field handling (`time`, `partners`) across validators, JSON, and DB.

Open Questions:
- Confirm representation in DB for tuples (array/text/json) in L2.
- Confirm update/create payload shape specifics in L2.
