# Domain Structure Code And Doc Review

## Objective & Hypothesis

Objective: evaluate whether the current code structure and PRD / TDD documentation organization fit the product's business domains, identify structural smells, and execute the approved notification boundary slices.

Hypothesis: the durable docs already name useful product boundaries, but some implementation folders, route surfaces, and operational concepts may mix actor/tooling concerns with domain concepts.

## Guardrails Touched

- The user approved mutation through Slice 10 for `notification-reliability-dossier`.
- Keep schema changes expand-only.
- Use docs as product authority, code as implementation evidence, and tasks as temporary reasoning buffer.
- Separate business object, bounded context, actor, technical unit, and infrastructure state.

## Verification

- Compare PRD domain-structure and behavior docs with Product TDD contracts.
- Sample backend domains, entities, repositories, and controllers.
- Sample frontend domains, routes, queries, and pages.
- Use sub-agent findings as independent evidence, then cross-check key claims locally.
- 2026-04-19 execution verification:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend exec tsx --test src/domains/pr-core/services/pr-message-thread.service.test.ts src/infra/notifications/wechat-pr-message.test.ts`
  - `pnpm --filter @partner-up-dev/backend exec tsx --test src/services/WeChatSubscriptionMessageService.test.ts`
  - `pnpm --filter @partner-up-dev/backend db:lint`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`

## Findings Snapshot

The current PRD / TDD layering is mostly sound: PRD owns product intent and vocabulary, Product TDD owns cross-unit authority and contracts, Unit TDD is intentionally sparse, and Deployment owns runtime truth.

The main structural risks are not caused by the top-level repository layout. They come from several concepts whose business semantics are strong but whose ownership is split or implicit:

- `Notification` mixes business quota and reliability policy with infra delivery/job execution.
- `Support And Operations` currently overloads user-facing support, event beta-group coordination, admin tooling, and configuration.
- `Booking Support` is canonical business vocabulary, while `Support Resource` is an internal sub-concept; `ResourceSupport` is not currently a stable glossary term.
- Backend `pr-core` is becoming a gravity center for participation, PR messaging, identity/PIN helpers, share metadata, anchor booking triggers, and notification scheduling triggers.
- Frontend route pages, especially `AnchorEventPage.vue` and `AnchorPRPage.vue`, own more orchestration than the frontend architecture document expects from pages.
- `cross-unit-contracts.md` is useful but is trending toward a large mixed-granularity contract file.

Preferred next step is semantic cleanup before directory reshuffling: write small 8-question dossiers for the complex concepts, validate them in `tasks/`, then only promote durable truths that survive code and product review.

## Dossiers

- [Notification And Reliability](./10-notification-reliability-dossier.md)
- [Booking Support](./20-booking-support-dossier.md)
- [Support And Operations](./30-support-operations-dossier.md)

## Execution Scope Approved On 2026-04-19

Approved implementation target:

- execute Notification Slice 1 through Slice 10
- record Slice 11 and Slice 12 as future references

Slice status:

- Slice 1: notification domain boundary for PR message unread waves
- Slice 2: channel adapter seam
- Slice 3: neutral dispatch result
- Slice 4: booking result, activity start, confirmation reminder, and new-partner dispatch policy under `domains/notification`
- Slice 5: unified notification kind/channel/opportunity code model
- Slice 6: `notification_opportunities` schema
- Slice 7: `notification_waves` schema
- Slice 8: Product TDD notification contract split
- Slice 9: frontend join-success notification prompt boundary
- Slice 10: legacy re-export cleanup

Future references:

- Slice 11: multi-channel channel-preference and recipient-address model
- Slice 12: first non-WeChat channel adapter implementation
