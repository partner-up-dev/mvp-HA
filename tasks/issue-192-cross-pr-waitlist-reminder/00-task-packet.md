# Issue 192 Cross-PR Waitlist Reminder

## Objective & Hypothesis

Add an optional reminder path when a user joins a PR waitlist.

Issue: https://github.com/partner-up-dev/mvp-HA/issues/192

Hypothesis:

- When a user enters a `PENDING` waitlist slot, the user may opt in to be reminded when another PR with the same type and same location has joinable capacity.
- Cross-PR reminder state belongs to the waitlist slot preference and does not change the original PR waitlist queue.
- The original waitlist promotion behavior remains focused on the source PR and continues to use `WAITLIST_PROMOTED`.
- Cross-PR availability should use a distinct notification semantic from promotion because the user is not automatically moved into the alternative PR.
- Candidate matching can start from exact `PartnerRequest.type` and exact trimmed `PartnerRequest.location`, pending product confirmation.
- Candidate availability should be backend-authoritative and revalidated at dispatch time.
- One source waitlist slot should not repeatedly notify the same user for the same alternative PR.
- The source waitlist partner closes only when the user successfully fulfills the alternative opportunity by joining the alternative PR. Notification delivery, page open, and failed alternative join attempts do not close the source slot.

## Guardrails Touched

- PR lifecycle and partner-slot state remain backend-authoritative.
- A pending waitlist slot remains `Partner.status = "PENDING"` until the source PR promotion path changes it.
- Cross-PR reminders must not make pending users active participants, reveal PR messages, or count toward active capacity.
- Frontend may collect the opt-in preference, but backend owns candidate eligibility, notification opportunity creation, dispatch-time revalidation, and delivery persistence.
- Notification delivery stays behind the existing notification infra and records durable opportunities and deliveries.
- Existing `WAITLIST_PROMOTED` copy and behavior stay intact for source-PR automatic promotion.
- Existing join gates and time-conflict checks continue to govern actual join attempts on the alternative PR.
- Existing user notification subscription quota and WeChat channel configuration remain the delivery boundary.
- Source waitlist cancellation caused by alternative fulfillment should be auditable with the source PR, source partner slot, alternative PR, and reason.

## Resolved Decision Questions

- Confirm `same type` means exact normalized `PartnerRequest.type`.
- Confirm `same location` means exact normalized `PartnerRequest.location`.
- Confirm whether the first slice should notify about already-existing alternative PRs immediately after waitlist entry, newly-created/newly-published alternatives, capacity changes from exit/release, or all of these.
- Confirm whether the notification kind should be a new semantic such as `WAITLIST_ALTERNATIVE_AVAILABLE`, or reuse `WAITLIST_PROMOTED` transport with a payload subtype.
- Confirm whether the opt-in should consume the same WeChat template quota bucket as waitlist promotion or receive a distinct frontend subscription item.

## Decisions

- `same type` uses exact normalized `PartnerRequest.type`.
- `same location` uses exact normalized `PartnerRequest.location`.
- The first slice covers both existing alternatives at waitlist entry and later alternatives created by publish, status, content, capacity-release, and admin/event-assisted availability changes.
- Cross-PR reminders use distinct notification kind `WAITLIST_ALTERNATIVE_AVAILABLE`.
- The WeChat transport reuses the waitlist-promoted template shape with alternative-specific status and remark copy.
- The frontend subscription surface shows `WAITLIST_ALTERNATIVE_AVAILABLE` as a separate quota item.
- The source waitlist slot remains `PENDING` when an alternative notification is sent.
- The source waitlist slot is closed as `CANCELLED` only after the user successfully joins the alternative PR.
- Opening the alternative PR, dismissing the notification, or failing to join the alternative PR leaves the source waitlist slot unchanged.
- If the source waitlist slot is promoted before alternative dispatch, alternative dispatch skips because the source slot is no longer pending.
- If the user successfully joins an alternative PR, the cancellation side effect should clear source join-gate resolutions and write an operation log entry such as `partner.waitlist_cancel_alternative_joined`.

## Implementation Status

- Backend schema stores per-slot alternative reminder opt-in on `partners` and a distinct WeChat quota bucket on `user_notification_opts`.
- Backend waitlist command accepts `alternativePrReminderOptIn` and persists it only for `PENDING` slots.
- Backend alternative reminder service scans exact normalized type and location, revalidates candidate capacity/status/visibility, and schedules distinct notification opportunities.
- Backend rescans a user's opted-in pending source slots when `WAITLIST_ALTERNATIVE_AVAILABLE` quota turns positive, covering the waitlist-command-before-subscribe prompt sequence.
- Dispatch preparation revalidates recipient activity/openId/quota, source pending slot ownership and opt-in, source/candidate type-location match, candidate availability, and recipient time-window conflict.
- Successful join of a matching alternative PR cancels matching source pending slots, clears source join-gate resolutions, and logs `partner.waitlist_cancel_alternative_joined`.
- Frontend waitlist modal adds the opt-in checkbox and includes `WAITLIST_ALTERNATIVE_AVAILABLE` in the post-waitlist subscription prompt when selected.
- Durable docs updated in PRD rules, cross-unit contracts, and notification contracts.
- Focused backend scenario coverage added for opt-in dispatch readiness, no-opt-in dispatch skip, and source waitlist cancellation after joining a matching alternative PR.
- Static verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend db:lint`
  - `pnpm --filter @partner-up-dev/backend test:unit`
  - `pnpm --filter @partner-up-dev/frontend build`
- Runtime scenario verification completed with root runner:
  - `pnpm run test:scenario backend`

## Likely Implementation Surface

- Product truth:
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/notification-contracts.md`
- Backend schema and repository:
  - `apps/backend/src/entities/partner.ts`
  - `apps/backend/src/repositories/PartnerRepository.ts`
  - `apps/backend/drizzle/`
- Backend PR waitlist command:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/backend/src/domains/pr-core/use-cases/waitlist-pr.ts`
  - `apps/backend/src/domains/pr-core/services/waitlist.service.ts`
- Backend notification pipeline:
  - `apps/backend/src/domains/notification/model/notification-kind.ts`
  - `apps/backend/src/entities/user-notification-opt.ts`
  - `apps/backend/src/services/WeChatSubscriptionMessageService.ts`
  - `apps/backend/src/infra/notifications/`
  - `apps/backend/src/domains/notification/services/`
- Frontend waitlist flow:
  - `apps/frontend/src/domains/pr/ui/composites/PRWaitlistFlow.vue`
  - `apps/frontend/src/domains/pr/ui/gates/PRWaitlistFallbackConfirmGate.vue`
  - `apps/frontend/src/domains/pr/queries/usePRActions.ts`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`

## Verification

- Backend scenario: opt-in waitlist entry creates or schedules a cross-PR reminder opportunity when a same-type same-location alternative PR is joinable.
- Backend scenario: no opt-in creates no cross-PR reminder opportunity.
- Backend scenario: different type, different location, hidden PR, source PR, and non-joinable status are skipped.
- Backend scenario: dispatch revalidation skips when the source waitlist slot is no longer pending.
- Backend scenario: dispatch revalidation skips when the alternative PR is no longer joinable.
- Backend scenario: dedupe prevents repeated notifications for the same source slot and alternative PR.
- Frontend scenario or component coverage: waitlist flow submits the checkbox preference and shows the correct subscription prompt state.
- Focused commands run:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend db:lint`
  - `pnpm --filter @partner-up-dev/backend test:unit`
  - `pnpm --filter @partner-up-dev/frontend build`
- Scenario command run:
  - `pnpm run test:scenario backend`
