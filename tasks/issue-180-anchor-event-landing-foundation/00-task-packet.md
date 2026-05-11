# Task Packet - Issue 180 Anchor Event Landing Foundation

## MVT Core

- Objective & Hypothesis: land GitHub issue `#180` as a new Anchor Event landing foundation centered on `/e/:eventId`, with backend-authored landing mode assignment, event-owned rollout config persisted through the infra `config` table, and frontend stabilization plus timeout fallback. Hypothesis: the safest slice is to keep `/events/:eventId` unchanged, add one parallel landing shell route, store event-owned rollout config under an Anchor Event namespace in `config`, and let `FORM` remain the default fallback experience while `CARD_RICH` reuses existing rich-card capability.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - backend Anchor Event domain, config persistence, and admin event-scoped config routes under `apps/backend/src/*`
  - frontend router, Anchor Event landing route/page assembly, admin event workspace UI, and event-domain queries under `apps/frontend/src/*`
- Verification:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/frontend build`
  - targeted manual read-through of `/e/:eventId` route wiring, timeout fallback behavior, and admin landing-config editing path

## Input And Mode

- Input Type: `Intent`
- Active Mode: `Execute`

## Impact Handshake

- Address and Object:
  - PRD / Product TDD truth for new `/e/:eventId` landing entry and landing assignment contract
  - backend Anchor Event landing config schema, namespace, parse / serialize, assignment use-case, and admin/public controllers
  - frontend `/e/:eventId` route, landing shell page, assignment timeout + localStorage stabilization, and admin landing-config editor
- State Diff:
  - From: only `/events/:eventId` exists; no landing assignment contract; no event-owned landing rollout config in `config`; no admin landing rollout editor
  - To: `/e/:eventId` exists and can enter `FORM` or `CARD_RICH`; backend returns landing assignment with revision; frontend stabilizes by `eventId + assignmentRevision`; admin can edit event-owned landing rollout config
- Blast Radius Forecast:
  - backend `anchor-event`, `config`, and admin event config surfaces
  - frontend route graph, event-domain queries, and admin event workspace
  - durable docs for route-to-API coordination and authority boundaries
- Invariants Check:
  - `/events/:eventId` keeps its existing rich page behavior
  - `#180` does not implement recommendation flow, candidate ordering, cinematic handoff, or telemetry
  - backend remains authoritative for landing assignment truth
  - `FORM` remains the timeout fallback experience
- Verification:
  - compile/type checks
  - manual route and admin-config inspection

## Confirmed Scope Decisions

- `/e/:eventId` is a new landing entry and does not replace `/events/:eventId`
- `FORM` and `CARD_RICH` are the two supported landing modes for `#180`
- `FORM` inside `#180` is only a simple placeholder text experience
- assignment timeout fallback enters `FORM`
- frontend stabilization key includes `eventId + assignmentRevision`
- landing config is event-owned, persisted through the infra `config` table, with namespace and payload semantics owned by Anchor Event
- landing rollout no longer has a separate product-level `available variants` switch; `CARD_RICH` ratio `0` means pure `FORM` rollout
- operator edits landing rollout in the existing Anchor Event admin workspace rather than a new standalone admin page

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/backend typecheck`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
