# Task Packet - PR Message Unread-Wave Debounce

## MVT Core

- Objective & Hypothesis: change `PR_MESSAGE` notification timing from immediate scheduling on the first unread message to one delayed summary opportunity per `PR / recipient / unread wave`. Hypothesis: using one DB-backed delayed job per unread wave will preserve the existing wave invariant while turning short message bursts into one summary notification without relying on in-process timers.
- Guardrails Touched:
  - typed input: `Intent`
  - active mode: `Solidify` -> `Execute`
  - product timing semantics in `docs/10-prd/behavior/workflows.md`
  - product invariant semantics in `docs/10-prd/behavior/rules-and-invariants.md`
  - cross-unit backend/frontend contract in `docs/20-product-tdd/cross-unit-contracts.md`
  - backend scale-to-zero job execution model in `apps/backend/AGENTS.md`
- Verification:
  - update durable docs so they mention delayed unread-wave summary timing
  - confirm `PR_MESSAGE` schedules a delayed DB-backed job instead of immediate execution timing
  - confirm handler still revalidates participation, unread-wave state, and quota at send time
  - add focused tests for debounce run-at computation and PR message template payload mapping
  - run backend typecheck
  - run backend build
  - run focused node tests

## Solidify Notes

- Address and Object:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-message.ts`
  - `apps/backend/src/infra/notifications/wechat-pr-message.ts`
  - `apps/backend/src/infra/notifications/wechat-pr-message.test.ts`
  - `apps/backend/src/repositories/PRMessageRepository.ts`
  - `apps/backend/src/services/WeChatSubscriptionMessageService.ts`
  - `apps/backend/src/services/WeChatSubscriptionMessageService.test.ts`
- State Diff:
  - From: the first unread message in a wave schedules a `PR_MESSAGE` job with `runAt = now`, and later unread messages in that same wave do not change the already-scheduled send timing.
  - To: the first unread message in a wave schedules one `PR_MESSAGE` job with `runAt = firstUnreadMessageCreatedAt + fixed debounce window`; when the job executes, it recomputes latest unread sender/time/count from DB and sends one summary notification if the wave is still pending.
- Blast Radius Forecast:
  - user-visible PR message notification timing
  - backend notification scheduling semantics for `PR_MESSAGE`
  - no frontend API shape change
  - no DB schema change
- Invariants Check:
  - still at most one notification opportunity per `PR / recipient / unread wave`
  - still no `setTimeout` or in-process timer ownership
  - still no sliding debounce or count-based fast path in this slice
  - still consume notification credit only after successful send

## Result

- Implemented state:
  - `PR_MESSAGE` now schedules one DB-backed delayed job per unread wave using a fixed 5-minute debounce window
  - the scheduled payload now uses wave-owned naming (`waveStartMessageId`, `waveStartAuthorUserId`, `firstUnreadMessageCreatedAtIso`) instead of single-message preview semantics
  - the job still rehydrates latest unread sender, latest unread timestamp, and unread count from DB at execution time before sending the WeChat summary
- Durable docs updated:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
- Verification results:
  - `pnpm --filter @partner-up-dev/backend typecheck` passed
  - `pnpm --filter @partner-up-dev/backend build` passed
  - `node --test --import tsx src/services/WeChatSubscriptionMessageService.test.ts src/infra/notifications/wechat-pr-message.test.ts src/domains/pr-core/services/pr-message-thread.service.test.ts` passed
