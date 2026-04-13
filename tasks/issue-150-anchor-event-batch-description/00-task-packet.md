# Task Packet - Issue 150 AnchorEventBatch Description

## MVT Core

- Objective & Hypothesis: Complete issue #150 by adding an optional marketing description per anchor-event batch (for phrases like "after class run" or "run then shower") and expose it in both admin management and event-page consumption flows. Hypothesis: a nullable batch-level description field is enough to support this copy without changing batch scheduling semantics.
- Guardrails Touched:
  - docs/10-prd behavior around anchor event batch and time-window experience
  - docs/20-product-tdd cross-unit contract for event detail and admin workspace payloads
  - backend authority boundary for batch persistence and API serialization
  - frontend invariant that RPC-inferred batch shapes remain source-of-truth
- Verification:
  - pnpm --filter @partner-up-dev/backend typecheck
  - pnpm --filter @partner-up-dev/backend db:lint
  - pnpm --filter @partner-up-dev/frontend build

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - include backend schema + admin write path + event/admin read serializers
  - include frontend admin form editing and event-page display surfaces
  - include one forward-only drizzle migration
- Excluded for this issue:
  - non-null or constrained description requirement
  - automatic/default slogan generation backfill
  - recommendation or ranking logic changes
