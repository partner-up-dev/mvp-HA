# Task Packet - Admin PR System Message

## Objective & Hypothesis

- Objective & Hypothesis: let admins send a message to a specific Anchor PR from Admin Console, and render that entry in the user-facing PR thread as a system message. Hypothesis: extending persisted PR messages with an explicit message type plus one admin-only write path is enough to add operator messaging without weakening participant-only thread access rules.
- Guardrails Touched:
  - typed input: `Intent`
  - active mode: `Explore` -> `Execute`
  - product messaging semantics in `docs/10-prd/behavior/*`
  - cross-unit PR messaging contract in `docs/20-product-tdd/cross-unit-contracts.md`
  - backend PR messaging ownership under `apps/backend/src/domains/pr-core`
  - admin Anchor PR management ownership under `apps/backend/src/domains/admin-anchor-management` and `apps/frontend/src/domains/admin`
- Verification:
  - update durable docs so operator-authored system messages are explicit
  - add backend persistence / response support for PR message type
  - add admin-only API to post a system message to one Anchor PR
  - add Admin Console entry to submit that message
  - confirm user-facing PR thread renders system messages distinctly
  - run backend typecheck
  - run backend build
  - run focused backend node tests for PR message thread / notification behavior
  - run frontend build
