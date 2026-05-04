# Issue 188 Waitlist

## Objective & Hypothesis

Add PR waitlist behavior for full PartnerRequests.

Hypothesis:

- When a PR is full but not locked to start, a non-participant can join the waitlist.
- Waitlist records reuse `partners` with `status = "PENDING"`.
- Pending partners do not count as active participants and do not get message/roster participant privileges.
- When a slot is released by exit or release, the earliest pending partner is promoted first.
- A promoted waitlisted partner receives a dedicated `WAITLIST_PROMOTED` notification.
- The issue description should be corrected from reverse chronological application to earliest-submitted-first application.
- Join and waitlist keep separate frontend flows while sharing `PRJoinGates`; fallback confirmation is injected by the frontend flow and is absent from backend join-gate projection.

## Guardrails Touched

- PR lifecycle and partner-slot state remain backend-authoritative.
- Frontend renders waitlist affordances from backend detail read models rather than deriving membership locally.
- `LOCKED_TO_START` keeps the stop-join semantics and does not accept new waitlist entries.
- Existing active participant set remains `JOINED` / `CONFIRMED` / `ATTENDED`.
- Notification delivery stays behind the notification infra and records durable opportunities/deliveries.
- Backend join-gate projection owns configured gates only; frontend fallback confirmation copy belongs to the join or waitlist flow.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend exec tsx --test src/services/WeChatSubscriptionMessageService.test.ts`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `node scripts/run-scenario-tests.mjs backend`
- GitHub issue #188 description updated to earliest-submitted-first waitlist ordering and `FULL`-only waitlist scope.
- Backend scenario coverage includes `join_gate_projection_excludes_fallback_confirm`.
