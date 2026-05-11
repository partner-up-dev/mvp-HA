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
- `Identity And Session` exists as a real product boundary, while code is split across `domains/user`, `auth/*`, WeChat processes, frontend session storage, and PR Core helper services.
- Frontend route pages, especially `AnchorEventPage.vue` and `AnchorPRPage.vue`, own more orchestration than the frontend architecture document expects from pages.
- `cross-unit-contracts.md` is useful but is trending toward a large mixed-granularity contract file.

Preferred next step is semantic cleanup before directory reshuffling: write small 8-question dossiers for the complex concepts, validate them in `tasks/`, then only promote durable truths that survive code and product review.

## Dossiers

- [Notification And Reliability](./10-notification-reliability-dossier.md)
- [Booking Support](./20-booking-support-dossier.md)
- [Support And Operations](./30-support-operations-dossier.md)
- [PartnerRequest Core](./40-pr-core-dossier.md)
- [Identity And Session](./50-identity-session-dossier.md)

## Dossier Backlog

- Partner Lifecycle And Capability
- Anchor Event And Anchor Context
- Distribution And Attribution
- Admin And Operator Tooling
- Frontend Page Composition
- Analytics And Operation Log

## Working Conclusions After Issue 167 And 170 Review

- `#167` and `#170` together point toward one single `PR` domain and one single `PR` vocabulary across the whole repository.
- `anchor_partner_requests` is a retirement target after those changes.
- PR-owned policy/state fields should likely merge into `partner_requests`, especially:
  - visibility status
  - confirmation window offsets
  - join-lock offset
  - booking-triggered time
  - auto-hide time
  - location-source provenance if it remains PR-owned
- `anchor_partner_requests.anchor_event_id` should leave the PR core model together with `batch_id`.
- `Anchor Event` should create PRs by selecting a time window from its pool and materializing the needed PR-owned fields directly into `partner_requests`.
- `PR type` and copied PR-owned context can classify the resulting PR. Event identity should not remain a durable PR-side foreign key.
- `community_partner_requests` becomes a removal target after `#167`.
- A likely post-167/170 structure is:
  - `PR`
  - `Partner`
  - `PR Sharing`
  - `PR Message`
  - `Anchor Event` as creator/orchestrator with no durable PR-side attachment table

Semantic cleanup target:

- retire `Community PR` as a business term
- retire `Anchor PR` as a business term
- retire `prKind`, `ANCHOR`, and `COMMUNITY`
- retire backend split domains such as `pr-anchor` and `pr-community`
- retire subtype tables `community_partner_requests` and `anchor_partner_requests`
- retire repositories, DTOs, and use cases centered on `Anchor PR` / `Community PR`
- converge frontend PR types, queries, pages, and components on one `PR` model
- converge canonical routes on one `PR` route family

## Spin-off Task Packet

The `pr-core` rewrite together with issue `#167` and issue `#170` now lives in:

- [PR Unification With Issue 167 And 170](../pr-unification-167-170/00-task-packet.md)

This review packet remains the source dossier and boundary analysis input for that execution task.

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
