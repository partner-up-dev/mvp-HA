# Issue 183 Partner Bounds Minimum

## Objective & Hypothesis

Allow `PartnerRequest.minPartners` to be `1` so L1 activities such as jogging or study can be viable with the creator alone.

Hypothesis:

- Manual PR and Anchor Event default inputs accept `minPartners = 1`.
- Automatic creation paths keep fallback `minPartners = 2` when the input is missing or invalid.
- `maxPartners` remains optional; when present it must be at least `2` and at least `minPartners`.
- A published PR with `minPartners = 1` can become `READY` immediately after the creator slot is created.

## Guardrails Touched

- PR lifecycle status remains backend-authoritative.
- Partner bounds validation stays in PR domain services and is mirrored by frontend UX validation.
- Anchor Event defaults reuse the same partner-bounds rule.
- Historical migrations remain immutable; no schema change is required because partner bounds are nullable integers without a database check constraint.

## Verification

- `pnpm exec tsx --test src/domains/pr-core/services/partner-bounds.service.test.ts src/domains/anchor-event/services/form-mode.test.ts` passed from `apps/backend`.
- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend db:lint` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm --filter @partner-up-dev/backend test:scenario` passed after loading `apps/backend/.env` into the command environment.
- Residual sweep found only intentional `maxPartners >= 2` and automatic fallback `2` references.

## Implementation Notes

- User confirmation on 2026-04-29: automatic path fallback stays `2`.
- User confirmation on 2026-04-29: `maxPartners = 1` must be rejected.
