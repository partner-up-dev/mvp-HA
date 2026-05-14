# Source Notes

## Vitest v4 Release

- Source: <https://github.com/vitest-dev/vitest/releases/tag/v4.0.0>
- Stable `v4.0.0` release date: 2025-10-22.
- Relevant release notes:
  - `projects` replaces deprecated `workspace`.
  - Vite 5 support is removed; this repository uses Vite 6 today.
  - Reporter APIs changed in v4, so custom reporter work should target v4 APIs.

## Projects

- Source: <https://v4.vitest.dev/config/projects>
- Relevant claim: `projects` accepts project-level test configuration.
- Migration implication: backend unit, frontend unit, backend scenario, and
  system scenario should be first-class Vitest projects.

## Global Setup

- Source: <https://v4.vitest.dev/config/globalsetup>
- Relevant claim: global setup files can export `setup`/`teardown`, or a
  default function that returns teardown.
- Migration implication: scenario runtime ownership should be validated through
  a lifecycle spike before full migration.

## Reporters

- Source: <https://v4.vitest.dev/guide/reporters>
- Relevant claim: Vitest provides built-in reporters, supports custom
  reporters, and includes an `agent` reporter for AI-agent-friendly output.
- Migration implication: start with built-in `agent`, then add custom reporter
  only if scenario context needs cannot be met.

## Custom Reporters

- Source: <https://v4.vitest.dev/guide/advanced/reporters>
- Relevant claim: Vitest reporters can be extended/imported from Vitest node
  APIs.
- Migration implication: reporter spike should validate the smallest custom
  surface before implementation.

## Test Context

- Source: <https://v4.vitest.dev/guide/test-context>
- Relevant claim: Vitest test context supports attachments.
- Migration implication: scenario records and failure artifacts may be attached
  to test context if terminal reporter output should stay compact.
