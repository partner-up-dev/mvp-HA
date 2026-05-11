# XHS Poster Product Local Time

## Objective & Hypothesis

- Fix XHS caption/poster prompt inputs so PR time windows are represented in product local time.
- Hypothesis: XHS poster says 6:00 for a 14:00 PR because prompt variables pass UTC ISO strings directly to the LLM.

## Guardrails Touched

- Backend owner: `apps/backend/src/services/llm/prompt-variables.ts`
- Share generation surfaces: XHS caption and XHS poster HTML prompts.
- Time invariant: PR runtime storage can stay canonical ISO while user-facing generated copy receives product local time.

## Verification

- Add backend unit coverage proving `2026-05-04T06:00:00.000Z` appears to prompt consumers as `2026-05-04 14:00`.
- Run targeted backend unit test.
- Run backend typecheck if targeted test passes.

## Verification Results

- `pnpm --filter @partner-up-dev/backend exec tsx --test src/services/llm/prompt-variables.test.ts` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `git diff --check` passed.
