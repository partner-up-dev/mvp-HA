# Shift-Left Spike Strategy

## Purpose

Resolve high-risk test platform decisions before bulk migration. The migration
should prove lifecycle, reporting, and artifact mechanics with tiny focused
prototypes before converting all tests.

## Source Anchors

- Vitest v4 projects config supports project-level settings including
  `setupFiles` and `globalSetup`.
- Vitest v4 `globalSetup` can export `setup`/`teardown`, or a default setup
  function that returns a teardown function.
- Vitest v4 reporters include built-in compact reporters and an `agent`
  reporter intended to reduce AI agent token usage.
- Vitest v4 supports custom reporters.
- Vitest test context supports attachments, which may be useful for failure
  artifacts if reporter output alone is insufficient.

## Spike Order

1. Lifecycle spike for scenario shared resources.
2. Reporter/artifact spike for concise terminal output plus `.result` details.
3. Minimal project skeleton spike for one backend unit and one frontend unit.
4. One backend scenario through native Vitest scheduling.
5. One system scenario through native Vitest scheduling.

## Exit Criteria

- Each high-risk mechanism is proven on one small target before broad edits.
- Every spike records observed behavior, constraints, and follow-up decisions in
  this task directory.
- Any mismatch between expected Vitest behavior and existing scenario invariants
  stops execution for user confirmation.
