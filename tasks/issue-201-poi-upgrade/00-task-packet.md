# Issue 201 POI Upgrade

## Objective & Hypothesis

Upgrade POI from name-as-primary-key to an integer-id entity while preserving PR and Anchor Event location semantics.

Hypothesis: `POI.id` can become the durable integer identity, `POI.name` can carry the previous text identifier, and `PR.location` plus Anchor Event `locationPool` can keep using the same arbitrary string/name matching contract by routing location lookups through POI name service methods.

## Guardrails Touched

- Constraint input route: product behavior stays stable while the technical data contract changes.
- Product TDD owner: POI identity, PR/Event to POI lookup contract, public/admin POI API shape.
- Backend entity/repository/service/controller boundaries.
- Frontend typed RPC consumers for public POI gallery and Admin POI management.
- Forward-only migration and idempotent seed behavior.

## Verification

- `pnpm db:lint`
- `pnpm test:unit:backend`
- `pnpm test:unit:frontend`
- Targeted review of PR/Event POI lookups to ensure PR `location` resolves by `POI.name`.
