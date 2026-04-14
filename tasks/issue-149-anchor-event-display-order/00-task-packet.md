# Task Packet - Issue 149 AnchorEvent Display Order

## MVT Core

- Objective & Hypothesis: Complete issue #149 by making AnchorEvent exposure order random enough to avoid persistent head-item bias while keeping implementation lightweight and backend-authoritative. Hypothesis: randomizing the active event catalog order on each `GET /api/events` call will improve exposure balance across `/events`, `/events/search`, and home highlights without schema changes.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - backend authority boundary for event catalog ordering (`Controller -> Use Case -> Repository`)
  - frontend invariant that `useAnchorEvents` consumers do not hardcode their own durable ordering truth
- Verification:
  - run backend typecheck and build
  - run frontend build regression
  - manually refresh `/events` multiple times and confirm order can vary
  - manually open `/events/search` and confirm default event follows current first returned item with no flow break
  - manually check home highlights still render top 4 cards from current catalog order

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - include all frontend surfaces that consume `GET /api/events`
  - keep randomization in backend use-case layer only
  - keep random window as per-request re-shuffle
- Excluded for this issue:
  - persistent exposure counters or weighting tables
  - adding `showIndex` / `displayOrder` to `anchor_events`
  - changing `/api/apr/search` ordering
  - introducing new telemetry taxonomy
