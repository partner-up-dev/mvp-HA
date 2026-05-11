# Task Packet - Issue 187 Anchor Event Time Window Description

## MVT Core

- Objective & Hypothesis: Restore Anchor Event time-window description after legacy Anchor Event Batch removal by attaching an optional description to each `timePoolConfig.startRules[]` entry and carrying the generated-window description through admin preview, Form Mode start options, and Card/List creation pickers. Hypothesis: start-rule-owned copy is the smallest stable owner because current time windows are generated from start rules rather than persisted batch rows.
- Guardrails Touched:
  - PRD Anchor Event browsing and Form Mode time selection behavior
  - Product TDD Anchor Event read/admin contracts
  - backend `anchor_events.time_pool_config` JSON schema and generated time-window projection
  - frontend RPC-inferred event detail / Form Mode payloads and Admin Anchor Event editor
- Verification:
  - `pnpm --filter @partner-up-dev/backend test:unit`
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend db:lint`
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - add `description` to absolute and recurring start rules
  - materialized windows inherit the first non-empty matching start-rule description by start-rule order
  - expose `description` on public create time windows, Form Mode start options, and Admin time-window preview
  - keep advanced Form Mode synthetic options descriptionless
- Excluded:
  - separate description matching rules
  - demand-card copy changes outside creation picker option labels

## Verification Log

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `pnpm --filter @partner-up-dev/backend db:lint` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline.
