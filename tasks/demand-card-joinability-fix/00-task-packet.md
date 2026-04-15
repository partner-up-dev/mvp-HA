# Task Packet - Demand Card Joinability Fix

## MVT Core

- Objective & Hypothesis: fix `AnchorEventPage` card-mode demand-card generation by moving demand-card ownership to a backend-authored read contract. Hypothesis: the current bug exists because frontend locally groups `event detail` PRs with a broader visible set than backend `join-demand-card` accepts. A dedicated `GET /api/events/:eventId/demand-cards` contract can share the same joinable candidate rules as demand-card join while preserving the broader `batches[].prs` event-detail contract for list mode.
- Guardrails Touched:
  - `apps/backend/src/domains/anchor-event/*` owns demand-card projection and should stay aligned with `join-demand-card`
  - `apps/backend/src/controllers/anchor-event.controller.ts` adds a new typed read route without widening controller business logic
  - `apps/frontend/src/pages/AnchorEventPage.vue` card mode should switch data source without changing list mode or create-flow semantics
  - `docs/20-product-tdd/cross-unit-contracts.md` should reflect the new route-level contract because frontend depends on it directly
- Verification:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/frontend build`
  - code inspection that `GET /api/events/:eventId/demand-cards` and `POST /api/events/:eventId/demand-cards/:cardKey/join` share the same joinable candidate semantics (`OPEN` / `READY`, same grouping fingerprint)

## Execution Notes

- Input Type: Reality
- Active Mode: Diagnose -> Execute
- Evidence:
  - frontend `buildDemandCards(...)` currently groups every batch PR by `cardKey` without backend-authoritative joinable filtering
  - backend `join-demand-card` only considers `OPEN` / `READY` candidates joinable
  - backend event detail still returns broader visible PRs that list mode legitimately uses, so narrowing `batches[].prs` would change a different contract
- Scope Decision:
  - keep `GET /api/events/:eventId` unchanged for list mode and existing PR browsing
  - add a dedicated backend-owned `GET /api/events/:eventId/demand-cards` read contract for card mode
  - reuse shared domain logic between demand-card listing and demand-card join selection
  - list mode keeps the broader event-detail contract but should hide `EXPIRED` PR rows in UI while still allowing completed (`CLOSED`) PR rows to remain visible
