# Issue 182 PR Page UX

## Objective & Hypothesis

Improve PR detail readability and post-join notification onboarding for issue #182.

Hypothesis:

- PR detail and share metadata should identify an untitled PR by location first, then type.
- Empty preferences add visual noise in the facts card and can be omitted.
- The join-success notification prompt should focus on the three reminders most relevant immediately after joining.
- The facts-card participant row should scan as a compact label row, while detailed min/max capacity facts belong in the roster modal.
- The participant row should keep partner badges as the value surface, with compact capacity count kept in the trailing affordance.
- The participant row trailing affordance should use a shared `InfoRowAction` primitive so only the right-side action is clickable while the row keeps InfoRow rhythm.
- The roster modal IA should avoid duplicated "搭子花名册" and count headers; capacity belongs inside the awareness lane as the local context for the roster list.

## Guardrails Touched

- Product owner: `docs/10-prd/behavior/workflows.md` and `docs/10-prd/behavior/rules-and-invariants.md`.
- Cross-unit contract owner: `docs/20-product-tdd/cross-unit-contracts.md` for backend-provided canonical share metadata.
- Backend surface: canonical PR share metadata builder.
- Frontend surface: PR detail page, PR facts card, shared WeChat notification subscription presentation, join-success PR flow.

## Verification

- Backend unit coverage for title fallback order.
- Frontend build for typed RPC and locale schema compatibility.
- Frontend token lint for style guardrails.
- Manual review of PR detail title, facts-card empty preference handling, and join-success visible notification kinds.

## Verification Results

- `pnpm --filter @partner-up-dev/backend test:unit` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` reports an existing finding in `src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue:696`; this task did not touch that file.
- After the participant-row follow-up, `pnpm --filter @partner-up-dev/frontend build` passed again.
- After restoring partner badges as the participant-row value, `pnpm --filter @partner-up-dev/frontend build` and `git diff --check` passed.
- After extracting `InfoRowAction`, `pnpm --filter @partner-up-dev/frontend build` and `git diff --check` passed; token governance still reports the existing `src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue:696` finding.
- After roster modal IA cleanup, `pnpm --filter @partner-up-dev/frontend build` and `git diff --check` passed; token governance still reports the existing `src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue:696` finding.

## Slices

- `01-current-ia.md`: current PR Page information architecture baseline and utility-row verification.
- `02-implementation-boundary-smell-map.md`: read-only implementation and boundary smell map for the next refactor slice.
- `03-boundary-topology.md`: topology view of current ownership pressure and candidate target boundaries.
- `04-cohesion-refactor.md`: implementation record for moving contextual, utility, and creator-local data into owning components.
