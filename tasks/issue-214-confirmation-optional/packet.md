# Issue 214 Confirmation Optional

## Objective & Hypothesis

Make participant confirmation optional at PR level. Anchor Event owns the default value, and PR creation materializes that default for future PRs.

Success means confirmation-enabled PRs keep existing behavior, while confirmation-disabled PRs skip confirm action, confirmation reminders, auto-confirm-on-join, and unconfirmed-slot release at confirmation end.

## Guardrails Touched

- Input route: Intent
- Mode: Execute
- Durable owners:
  - PRD behavior truth under `docs/10-prd/behavior/`
  - cross-unit PR lifecycle contract under `docs/20-product-tdd/cross-unit-contracts.md`
  - backend PR and Anchor Event persistence schemas
  - frontend Admin PR / Anchor Event configuration surfaces
  - PR join-success notification recommendation surface
- Protected invariants:
  - `check-in` remains available under the existing participation policy.
  - `join lock` remains effective.
  - PR Page persistent notification subscriptions remain unchanged.
  - Anchor Event defaults affect future materialized PRs only.

## Verification

- Add focused backend unit coverage for disabled confirmation behavior.
- Run backend unit tests for touched PR services.
- Run frontend type/build-oriented verification for touched Vue changes where practical.
