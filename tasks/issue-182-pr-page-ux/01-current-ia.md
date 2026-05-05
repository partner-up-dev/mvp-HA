# Current PR Page IA

## Objective & Hypothesis

Optimize the PR Page from implementation and UI/UX layers by first recording the current information architecture.

Hypothesis: the visible IA is mostly coherent, so the next improvement should focus on implementation boundaries and component responsibility placement.

## Guardrails Touched

- `apps/frontend/src/pages/PRPage.vue`
- Keep PR detail read, join, waitlist, message, booking-support, share, and reminder-subscription semantics unchanged.

## Current PR Page Information Architecture

```text
PR Page (/pr/:id)
|
+-- Loading / Error State
|
+-- Detail State
|   |
|   +-- Page Header [summary]
|   |   |
|   |   +-- Back
|   |   +-- PR Display Title
|   |   +-- Creator Quick Actions
|   |   |   |
|   |   |   +-- Edit Content
|   |   |   +-- Modify Status
|   |   |
|   |   +-- Meta
|   |       |
|   |       +-- Type Badge
|   |       +-- Status Badge
|   |
|   +-- Draft Publish Notice
|   |   |
|   |   +-- Publish Draft Action
|   |
|   +-- Event-assisted Create Handoff Notice
|   |
|   +-- Facts Card [summary]
|   |
|   +-- Contextual Action Area [actions]
|   |   |
|   |   +-- Release Notice
|   |   +-- Primary Blocked Notice
|   |   +-- Waitlist Notice
|   |   +-- Cancel Waitlist Action
|   |   +-- Join Action
|   |   +-- Waitlist Action
|   |   +-- Confirm / Check-in Action
|   |   +-- Exit Action
|   |   +-- Page Action Error
|   |
|   +-- Utility Area
|   |   |
|   |   +-- Utility Actions
|   |   |   |
|   |   |   +-- View Booking Support
|   |   |   +-- Message
|   |   |   +-- Share Group [share]
|   |   |       |
|   |   |       +-- Share / Invite
|   |   |       +-- Event Plaza Link
|   |   |
|   |   +-- Reminder Subscription Section [reliability]
|   |
|   +-- Drawers And Modals
|       |
|       +-- Share Drawer
|       +-- Edit PR Content Modal
|       +-- Update PR Status Modal
|       +-- Exit Confirm Dialog
|       +-- Cancel Waitlist Confirm Dialog
|       +-- Check-in Followup Modal
|
+-- Common Footer [support]
```

## Verification

- Recorded the current PR Page IA baseline before the utility-action layout mutation.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `git diff --check` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline.
- `agent-browser --session pr-page-verify snapshot -i` confirmed `查看资源补助` and `留言` both render on `http://localhost:4001/pr/2`.
- `agent-browser --session pr-page-verify eval --stdin` measured both buttons at the same `y` coordinate and same width: `查看资源补助` at `y=658`, `width=220`; `留言` at `y=658`, `width=220`.
- Full-page screenshot saved by `agent-browser` to `C:\Users\yyh\.agent-browser\tmp\screenshots\screenshot-2026-05-05T06-34-14-253Z-q1s0ae.png`.
