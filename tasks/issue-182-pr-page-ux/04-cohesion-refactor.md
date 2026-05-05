# PR Page Cohesion Refactor

## Objective & Hypothesis

Move PR Page state and data management closer to the UI components that consume it.

Hypothesis: the visible PR Page IA is acceptable; the primary maintainability issue is lifted local state and derived data in `PRPage.vue`. Moving contextual actions, utility actions, and creator controls into owning components should reduce route-entrypoint pressure without changing behavior.

## Guardrails Touched

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRContextualActions.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRUtilityActions.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRCreatorHeaderActions.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRDraftPublishNotice.vue`

## Implementation

### Contextual Actions

Added `PRContextualActions.vue`.

It now owns:

- release, blocked, and waitlist notices
- primary dock action projection
- join and waitlist flow refs
- confirm and check-in action state
- exit and cancel-waitlist confirm dialogs
- contextual action error refs
- primary CTA impression and click telemetry
- blocked-reason, confirm-tip, and check-in-tip rendering
- contextual pending WeChat replay command adapter through `defineExpose`

`PRPage.vue` now passes route-level context and listens for `action-success`.

### Utility Actions

Added `PRUtilityActions.vue`.

It now owns:

- booking-support entry visibility and navigation
- message entry visibility and navigation
- share drawer open state
- share drawer data consumption
- event-plaza secondary discovery link
- inline reminder subscription section visibility
- utility-row layout styles

`PRPage.vue` still keeps route-level share metadata for page head and route share registration.

### Creator Controls

Added `PRCreatorHeaderActions.vue` and `PRDraftPublishNotice.vue`.

They now own:

- header edit/status action visibility
- edit-content modal open state and editable field projection
- modify-status modal open state
- creator secondary-action telemetry
- draft publish mutation, auth payload application, route query replacement, and replay command adapter

The event-assisted-create handoff notice remains in `PRPage.vue` because it is route-handoff context.

## Resulting Parent Role

`PRPage.vue` now primarily owns:

- route id and query context
- PR detail loading/error/detail gate
- page title fallback
- facts-card handoff target registration
- page head and route share registration
- live polling refresh callback
- pending WeChat action replay dispatch to child command adapters

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline.
- `git diff --check` passed.
- `agent-browser --session pr-page-verify snapshot -i` on `http://localhost:4001/pr/2` confirmed key PR detail actions still render: `确认参与`, `退出`, `查看资源补助`, `留言`, `分享`, and `订阅 1 次`.
- `agent-browser --session pr-page-verify eval --stdin` measured `查看资源补助` and `留言` in the same row: both `y=658`, both `width=220`.
- Full-page screenshot saved to `C:\Users\yyh\.agent-browser\tmp\screenshots\screenshot-2026-05-05T07-52-11-742Z-9hw53m.png`.

## Follow-up Risks

- `useSharedPRActions` still mixes creator visibility with join/exit mutations. `PRContextualActions` no longer depends on creator controls, but this composable remains a future split candidate.
- `PRUtilityActions` computes its own share drawer context while `PRPage.vue` still computes route share metadata for head and route registration. This duplicates cheap computed projection, but keeps drawer state local and preserves route-level head ownership.
- Creator controls are split between header actions and draft publish notice to preserve PageHeader placement. A future scoped-controller pattern could unify them if this area grows.
