# Task Packet - PR Message WeChat Subscription Batch Summary

## Objective & Hypothesis

- Objective & Hypothesis: verify whether `PR_MESSAGE` notifications already use the WeChat subscription-message channel with the required batch-summary template fields, and align the implementation if not. Hypothesis: the current backend already schedules `PR_MESSAGE` WeChat jobs, but the subscription payload still uses single-message preview keywords instead of unread-wave batch summary fields.
- Guardrails Touched:
  - typed input: `Reality`
  - active mode: `Diagnose` -> `Execute`
  - backend notification ownership under `apps/backend/src/infra/notifications`
  - repository-only persistence querying under `apps/backend/src/repositories`
  - runtime template-config truth in `docs/40-deployment/environments.md`
- Verification:
  - inspect `create-pr-message` -> unread-wave gating -> WeChat job handler call path
  - add a focused unit test for `PR_MESSAGE` subscription keyword mapping
  - run backend typecheck
  - run backend build
  - run the focused node test file

## Result

- Current state before the fix: `PR_MESSAGE` notifications were already scheduled through the WeChat subscription-message channel, but the payload still used `thing1 / name2 / thing3 / time4` with single-message preview content.
- Implemented state:
  - `thing5` now carries the PR title
  - `time2` now carries the latest unread message send time at job execution
  - `name3` now carries the latest unread message sender
  - `thing4` now carries the unread message count summary plus `请尽快查看`
- Invariants kept:
  - one notification opportunity per `PR / recipient / unread wave`
  - recipient participation revalidation before send
  - notification credit consumption and `43101` handling
- Verification results:
  - `pnpm --filter @partner-up-dev/backend typecheck` passed
  - `pnpm --filter @partner-up-dev/backend build` passed
  - `node --test --import tsx src/services/WeChatSubscriptionMessageService.test.ts src/domains/pr-core/services/pr-message-thread.service.test.ts` passed
