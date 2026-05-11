# Anchor Event Default PR Notes

## Objective & Hypothesis

- Objective: add an Anchor Event-level default PR notes setting and materialize it onto newly created PRs when the create payload has no notes.
- Hypothesis: the existing event-default materialization path can own this behavior with a small extension, keeping persisted PR notes PR-owned after creation.

## Guardrails Touched

- PR creation resolves Anchor Event defaults at creation time.
- Anchor Event owns event-side defaults; created PRs store materialized runtime facts.
- Manual PR notes remain PR-owned content and should not be overwritten by event defaults.
- Existing PRs stay unchanged when an event default changes.

## Verification

- Backend scenario coverage should prove event default notes fill blank PR notes and preserve explicit PR notes.
- Type/build checks should cover the Hono RPC contract propagation to frontend Admin inputs.
- A targeted scenario command is preferred before broader scenario runs.

## Implementation Notes

- Added `anchor_events.default_pr_notes` as the event-owned template field.
- Materialization is guarded by empty/whitespace PR notes, so explicit PR notes remain authoritative.
- System auto-expansion creates the new PR with empty notes so the event default is applied to the new runtime PR instead of copying source PR notes.

## Verification Results

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm db:lint` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm test:scenario backend` passed after fixing the new scenario to avoid an existing same-user time-window conflict guard.
- `git diff --check` passed.
