# PartnerRequest Core Dossier

## 1. What It Is

`PartnerRequest Core` is the collaboration-object boundary around `PartnerRequest`.

Its stable semantic center is:

- one collaboration request as the object users create, read, join, leave, share, and revisit
- the shared base model for `Community PR` and `Anchor PR`
- visible PR status, partner thresholds, time windows, and creator ownership
- participant-slot state as the source for current count, availability, roster, and action affordances
- PR-scoped messaging visibility and read-marker semantics

Adjacent concepts with their own centers:

- `Identity And Session` owns user existence, roles, session continuity, PIN, and WeChat binding.
- `Partner` is the strongest submodel inside PR Core for join, exit, confirm, check-in, release, and partner-section semantics.
- `Notification` owns attention opportunities and dispatch reliability.
- `Anchor Event` owns event/batch/location context that can create or discover Anchor PRs.
- `Distribution And Attribution` owns share methods, share session, and `spm`.
- `Booking Support` owns fulfillment-support resources and booking execution semantics.

Current smell: backend `domains/pr-core` is the default place for many PR-adjacent concerns, so the folder name hides multiple bounded contexts.

## 2. Why It Exists

It exists to preserve the core collaboration invariant: a PR is the durable object that coordinates people around an activity intent.

Its responsibilities are:

- protect legal PR status transitions
- protect partner count and partner bounds
- expose public PR read models with backend-owned eligibility state
- coordinate create, publish, join, exit, update, and read workflows
- provide scenario-shared semantics for `Community PR` and `Anchor PR`
- preserve route/API contracts that make PRs re-enterable from links and history

The strongest reason to keep this boundary is that all downstream concepts need a stable answer to: "what collaboration object are we talking about, and who is currently attached to it?"

After `#167` and `#170`, this boundary is converging on four concrete submodels:

- `PR`
- `Partner`
- `PR Sharing`
- `PR Message`

The semantic cleanup target is repository-wide: `Community PR` and `Anchor PR` should leave the durable vocabulary, leaving one single `PR` term across schema, code, docs, API contracts, and routes.

## 3. Lifecycle

PR lifecycle:

1. A user or system creates a PR draft or published record.
2. A published PR enters `OPEN`.
3. Partner slots change active count.
4. Active count derives `OPEN`, `READY`, or `FULL`.
5. Time-window and scenario rules may move the PR into `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, or `EXPIRED`.
6. Updates are allowed according to creator/admin authority and status guards.
7. Revisit and share flows keep the PR visible through stable routes while backend read models provide current status.

Participant-slot lifecycle:

1. A user joins and receives a `JOINED` slot.
2. Community PR participants may exit.
3. Anchor PR participants may confirm, check in, exit, or be released.
4. Active slots are the authority for participant count and PR message visibility.
5. Exited/released slots remain audit and UX facts while active participant semantics stop applying.

PR messaging lifecycle:

1. A current active participant or operator creates one PR-scoped message.
2. Backend persists message author type and visibility context.
3. Current active participants can list messages.
4. Viewer explicitly advances read marker after seeing the thread.
5. Notification domain may open an unread wave from the message-created event.

## 4. Inputs And Outputs

Inputs:

- natural-language or structured PR creation payloads
- publish/update/admin status commands
- join/exit/confirm/check-in commands
- viewer identity, local PIN, and WeChat-bound user context
- Anchor Event/time-pool/location context for Anchor PR flows
- temporal facts such as current time, event start, confirmation window, and booking deadlines
- PR message create/list/read-marker commands

Outputs:

- `partner_requests`, scene-specific PR rows, and `partners`
- public PR detail/read models
- participant section view models
- PR message rows and inbox state
- domain events such as `pr.created`, `pr.status_changed`, `pr.message_created`, `partner.joined`, and slot lifecycle events
- share metadata projections
- downstream triggers consumed by notification, analytics, booking support, and operations

## 5. External Conditions

Important external conditions:

- current time and local time-window parsing
- session role and user identity
- WeChat binding for higher-trust Anchor actions
- local PIN continuity for Community PR ownership and recovery
- Anchor Event occurrence availability and creation rules
- booking deadline and booking-contact state
- notification quotas and channel availability for downstream effects
- scale-to-zero runtime for delayed side effects

Some PR complexity comes from temporal and environment coupling rather than PR state itself.

## 6. Invariants

Hard invariants:

- `PartnerRequest` is the external collaboration object.
- `Community PR` and `Anchor PR` share base PR semantics while allowing scenario-specific rules.
- Manual PR writes reject invalid partner bounds; system paths may normalize missing bounds to a safe minimum.
- Active participant count derives capacity status for statuses that still follow capacity.
- Only current active participants may see PR messages or advance read markers.
- Operator-authored system messages remain PR-scoped messages.
- A user with a conflicting non-terminal PR time window cannot claim another overlapping slot.
- Public PR read models must come from backend-owned state.

Likely invariants to make more explicit:

- `Partner` deserves an explicit submodel under PR Core with its own state transitions and capability rules.
- PR read/view assembly should remain separate from command-side state transitions.
- PR messaging is PR-scoped coordination, while notification wave policy belongs to Notification.
- Anchor Event should act as PR creator/orchestrator by selecting a time window and materializing PR-owned fields directly into the PR record.

## 7. How It Is Observed And Changed

Changed by:

- `create-pr-natural-language`
- `create-pr-structured`
- `publish-pr`
- `update-pr-content`
- `update-pr-status`
- `join-pr`
- `exit-pr`
- `confirm-slot`
- `check-in`
- `create-pr-message`
- `advance-pr-message-read-marker`
- Anchor Event controlled creation flows
- admin Anchor PR tooling

Observed through:

- `/cpr/:id`
- `/apr/:id`
- `/apr/:id/messages`
- `/pr/mine`
- participant profile routes
- admin PR and message workspaces
- share metadata
- domain events and operation logs

Event Storming view:

- Commands: create, publish, join, exit, confirm, check-in, update, post message, read marker.
- Events: PR created/status changed/content updated, partner joined/exited/confirmed/checked-in/released, PR message created.
- Aggregates: `PartnerRequest`, `PartnerSlot`, `PRMessageThread`.
- Policies: status derivation, capacity guards, time conflict, Anchor participation windows, message visibility.

## 8. Boundaries With Other Concepts

With `Identity And Session`:

- PR consumes user identity, role, PIN, and WeChat binding.
- Identity supplies who the actor is; PR decides whether that actor can mutate this PR.

Within `Partner`:

- PR owns the collaboration object.
- `Partner` owns slot progression rules, confirmation, release, check-in, and partner-section capability facts.

With `Notification`:

- PR emits business events such as `pr.message_created` and `partner.joined`.
- Notification consumes those events and owns notification opportunity/wave lifecycle.

With `Anchor Event`:

- Anchor Event supplies event/occurrence/location context.
- PR owns the resulting collaboration instance after creation.

With `Distribution And Attribution`:

- PR exposes canonical share metadata.
- Distribution owns share method execution and attribution propagation.

With `Booking Support`:

- PR supplies active participant and status facts.
- Booking Support owns support resource semantics, booking contact, and fulfillment execution.

## Evidence

- PRD derived boundary: `docs/10-prd/domain-structure/derived-boundaries.md`.
- PRD rules: `docs/10-prd/behavior/rules-and-invariants.md`.
- Product TDD PR lifecycle and messaging contracts: `docs/20-product-tdd/cross-unit-contracts.md`.
- Backend domain: `apps/backend/src/domains/pr-core`.
- Core entities: `apps/backend/src/entities/partner-request.ts`, `apps/backend/src/entities/partner.ts`, `apps/backend/src/entities/pr-message.ts`, `apps/backend/src/entities/pr-message-inbox-state.ts`.
- Frontend PR domain: `apps/frontend/src/domains/pr`.

## Current Smells

- `pr-core` mixes core PR lifecycle, participant reliability, PR messaging, share metadata, Anchor-specific participation policy, booking-trigger policy, and local PIN helpers.
- `user-pin-auth.service.ts` and `user-resolver.service.ts` sit under PR Core while their semantics belong closer to Identity.
- `partner-section-view.service.ts` is valuable but large; it combines read-model assembly, action eligibility, roster projection, Anchor policy projection, booking-contact projection, and fallback recommendation projection.
- PR messaging has clear PR ownership, but its notification side effects previously lived close to PR Core and now rely on event-driven Notification.
- `get-reimbursement-status.ts` inside PR Core is a support/booking-adjacent read concern.
- `anchor_partner_requests` mixes PR-owned lifecycle policy fields with Anchor Event attachment fields in one subtype table.
- `anchorEventId` and `batchId` currently pull PR reads, admin workspaces, and booking-support flows toward event-identity coupling.

## Direction

Recommended next structural direction:

- Keep `PartnerRequest Core` as the base aggregate and read model owner.
- Make `Partner` an explicit submodel under PR Core for join, exit, confirm, check-in, release, and partner-section capability semantics.
- Move local PIN and WeChat user resolution helpers from `pr-core` into Identity-owned services.
- Keep PR messaging inside PR Core for message/thread visibility, while keeping notification wave policy in Notification.
- Keep share descriptor generation as a PR-owned projection until Distribution/Share needs backend-side policy beyond projections.
- Merge PR-owned columns from `anchor_partner_requests` into `partner_requests` when `#167` and `#170` land, especially visibility status, confirmation offsets, join-lock offset, booking-triggered time, auto-hide time, and location-source provenance if it remains PR-owned.
- Retire `anchor_partner_requests` after those PR-owned columns move into `partner_requests`.
- Remove durable PR-side `anchorEventId` / `batchId` linkage after `#167` and `#170`, and let `Anchor Event` create PRs by choosing a time window from its pool and copying the needed PR-owned context at creation time.
