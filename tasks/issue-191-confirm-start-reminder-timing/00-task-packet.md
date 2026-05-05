# Task Packet - Issue 191 Confirm Start Reminder Timing

## Objective & Hypothesis

- Objective: ensure the confirmation-start reminder is not delivered before the PR confirmation window opens.
- Hypothesis: the current `REMINDER_CONFIRMATION` job policy permits early bucket claiming for `CONFIRM_START`, so the reminder can execute before `confirmationStartAt`. Giving only the `CONFIRM_START` trigger a precise zero-early schedule, plus migrating already-pending jobs, should remove the observed early-delivery path while preserving the existing end-reminder behavior.

## Guardrails Touched

- Input classification: `Reality`
- Active modes: `Diagnose` -> `Execute`
- Durable owner: backend notification timing for `REMINDER_CONFIRMATION`
- Code surfaces:
  - `apps/backend/src/infra/notifications/job-schedule-policy.ts`
  - `apps/backend/src/infra/notifications/wechat-reminder.ts`
  - `apps/backend/src/infra/notifications/job-schedule-policy.test.ts`
- Durable data:
  - pending `jobs` rows for `wechat.reminder.confirmation` / `CONFIRM_START`
- Docs:
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/notification-contracts.md`

## Evidence

- `CONFIRM_START` run time resolves to `policy.confirmationStartAt`.
- Job claiming uses `nowBucket >= dueBucket - earlyToleranceUnits`.
- The existing confirmation reminder policy uses a 5-minute resolution with `earlyToleranceUnits: 3`, allowing execution before `runAt`.
- `confirmSlot` rejects writes before the confirmation window, so an early reminder can send users to a still-blocked action.

## Verification

- Add a unit regression proving `CONFIRM_START` cannot be claimed before `runAt`.
- Preserve the existing coarse end-reminder policy.
- Run backend unit tests, backend typecheck, and DB migration lint.

## Result

- Implemented trigger-specific confirmation reminder scheduling:
  - `CONFIRM_START`: 1ms resolution, zero early-claim tolerance, unbounded late execution.
  - `CONFIRM_END_MINUS_30M`: existing 5-minute resolution and 3-bucket early tolerance retained.
- Added forward-only data migration `0041_confirmation_start_reminder_no_early_claim.sql` for pending/retry `CONFIRM_START` jobs.
- Added notification schedule policy unit coverage.
- Verification passed:
  - `pnpm --filter @partner-up-dev/backend test:unit`
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend db:lint`
