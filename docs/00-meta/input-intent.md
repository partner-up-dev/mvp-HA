# Input Route: Intent

## Trigger

Use when the business wants new behavior, scope, policy, or product strategy.

## Primary Owner

- `docs/10-prd/`

## Mode Relationship

- Common overlays: `Explore`, `Solidify`, `Execute`
- Do not assume these modes happen in a fixed order

## Forbidden

- Do not encode mechanism, topology, route wiring, or API structure in PRD.
- Do not skip impact review against existing product claims, workflows, rules, and scope.

## Read-Do Steps

1. Restate the intended product change and its success signal.
2. Read only the needed `_drivers/`, `behavior/*`, and the current business vocabulary owner under `docs/10-prd/`.
3. Update PRD so the changed or new product truth is explicit.
4. Identify downstream technical implications only after product truth is stable.
5. Promote technical follow-up into Product TDD or Unit TDD only when future drift would be expensive.

## Exit Criteria

- PRD reflects the revised product truth.
- Impact on existing product claims is explicit.
- Business vocabulary remains coherent.
