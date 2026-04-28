# Button Secondary Tone Migration

## Objective & Hypothesis

Button and ActionLink `tone="secondary"` should use the secondary color family. Existing rect/default usage sites that relied on the old primary-outline treatment should move to an explicit primary-outline tone.

## Guardrails Touched

- Shared action primitives own reusable action treatments.
- Frontend styling uses direct `sys` tokens first.
- Usage sites should express visual intent through primitive tone names instead of relying on accidental token mappings.

## Verification

- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
