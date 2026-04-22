# Task Packet - PR Unification With Issue 167 And 170

## MVT Core

- Objective & Hypothesis: Execute the `pr-core` rewrite together with issue `#167` and issue `#170`, and converge the repository on one single `PR` domain, one single `PR` vocabulary, and one single durable PR table. Hypothesis: unifying `Community PR` and `Anchor PR` as `PR`, removing PR-side `anchorEventId` / `batchId`, and treating `Anchor Event` as one optional discovery and assisted-create mode will reduce semantic duplication, shrink schema and repository surface, and produce a cleaner domain split between `PR`, `Anchor Event`, `Partner`, `PR Message`, `PR Sharing`, and Booking Support.
- Guardrails Touched:
  - `docs/10-prd/*` PR and Anchor Event product vocabulary
  - `docs/20-product-tdd/*` cross-unit contracts, state authority, and route/API contracts
  - backend schema and migration discipline for PR table consolidation
  - backend domain ownership across `pr-core`, `pr-anchor`, `pr-community`, `anchor-event`, `user`, and booking-support consumers
  - frontend route, query, and domain ownership for PR detail and Anchor Event discovery
- Verification:
  - update durable docs before or alongside contract-changing code
  - backend typecheck and build pass
  - frontend build passes
  - PR creation flows still work for user/admin Anchor Event initiated creation
  - PR detail, partner section, message thread, and sharing reads still work
  - Anchor Event page still shows discoverable PRs under the same type and time-pool rules
  - booking-support derivation still works after PR-side `anchorEventId` / `batchId` leave storage

## Solidify Notes

- Input Type:
  - Constraint for structural unification and batch-removal contract work
  - Intent for durable product vocabulary cleanup around `PR`
- Active Mode:
  - Solidify for the blueprint and contract definition
  - Execute once schema, route, and domain slices are approved
- Durable Owner:
  - product vocabulary and workflow truth in PRD
  - cross-unit contract truth in Product TDD
  - implementation truth in backend/frontend PR and Anchor Event domains
- Address and Object:
- `tasks/pr-unification-167-170/00-task-packet.md`
  - `tasks/pr-unification-167-170/10-action-preflight-problem-details-lld.md`
  - `tasks/pr-unification-167-170/20-single-pr-data-model-blueprint.md`
  - `docs/10-prd/*` PR and Anchor Event vocabulary/rule docs
  - `docs/20-product-tdd/*` PR route/API and authority docs
  - `apps/backend/src/entities/partner-request.ts`
  - `apps/backend/src/entities/anchor-partner-request.ts`
  - `apps/backend/src/entities/community-partner-request.ts`
  - `apps/backend/src/domains/pr-core`
  - `apps/backend/src/domains/pr-anchor`
  - `apps/backend/src/domains/pr-community`
  - `apps/backend/src/domains/anchor-event`
  - `apps/backend/src/domains/user`
  - `apps/backend/src/repositories/AnchorPRRepository.ts`
  - `apps/frontend/src/domains/pr`
  - `apps/frontend/src/domains/event`
- State Diff:
  - From: repo vocabulary, schema, and code still carry `Community PR`, `Anchor PR`, `prKind`, subtype tables, batch-centered creation, and event-id/batch-id keyed PR queries.
  - To: repo vocabulary converges on `PR`; `partner_requests` becomes the single durable PR table; `anchor_partner_requests` and `community_partner_requests` retire; `Anchor Event` offers one discovery and assisted-create mode; PR reads and writes center on one `PR` domain.
- Blast Radius Forecast:
  - PR schema, migration artifacts, repositories, controller params, DTOs, use-case names, route names, frontend query keys, and UI copy
  - Anchor Event creation/discovery flow
  - booking-support derivation and admin workspaces that currently read `anchorEventId` / `batchId`
  - PR message and sharing imports where naming still reflects split PR types
- Invariants Check:
  - `PR` remains the durable collaboration object
  - PR message visibility remains PR-owned
  - notification policy remains in `domains/notification`
  - Anchor Event page shows discoverable PRs under the same type and time-pool rules
  - partner lifecycle semantics remain backend-authoritative
  - rollout may keep temporary redirect compatibility, while canonical naming and ownership converge on one `PR`

## Semantic Cleanup Target

- retire `Community PR` as a business term
- retire `Anchor PR` as a business term
- retire `prKind`, `ANCHOR`, and `COMMUNITY`
- retire backend split domains such as `pr-anchor` and `pr-community`
- retire subtype tables `community_partner_requests` and `anchor_partner_requests`
- retire repositories, DTOs, and use cases centered on `Anchor PR` / `Community PR`
- converge frontend PR types, queries, pages, and components on one `PR` model
- converge canonical routes on one `PR` route family

## Target Topology

- backend `domains/pr`
  - `model/pr`
  - `model/partner`
  - `message`
  - `sharing`
  - `read-models`
- backend `domains/anchor-event`
  - `time-pool`
  - `discovery`
  - `create-pr`
- backend `domains/user`
  - PIN continuity
  - WeChat user resolution
- frontend `domains/pr`
  - one single PR model
  - partner section presentation logic
  - message and sharing surface
- frontend `domains/event`
  - Anchor Event page
  - time-pool driven PR discovery

## Semantic Ownership Target

- `PR` is the only durable collaboration object name
- `Anchor Event` is an optional discovery and assisted-create context that reuses the canonical PR create command
- `Partner` is a PR submodel
- `PR Message` and `PR Sharing` stay inside the PR boundary
- entry source is an acquisition concern, and execution behavior comes from explicit PR policy plus Booking Support dependencies
- canonical create surfaces are natural-language entry, structured form entry, and Anchor Event assisted create
- canonical create commands are `POST /api/pr/new/nl` and `POST /api/pr/new/form`
- Anchor Event assisted create reuses `POST /api/pr/new/form`
- authenticated natural-language and structured create should persist and publish in one backend-owned flow
- anonymous users may create `DRAFT` PRs through natural-language or structured form entry
- publishing a `DRAFT` PR requires an authenticated account and should reuse the WeChat login path
- creating an `OPEN` PR directly, including event-assisted create, requires an authenticated account and should reuse the same WeChat login path
- auto-generated PIN login and the page-level PIN help branch move to a separate follow-up issue and stay outside this task's implementation scope
- frontend PR-owned detail surfaces should converge on `PR*` naming, with `AnchorPRPage -> PRPage`, `AnchorPRMessagesPage -> PRMessagesPage`, and `AnchorPRBookingSupportPage -> PRBookingSupportPage`
- the single `PRPage` should continue carrying the still-valid page branches: draft-publish, creator quick actions, partner join or exit or confirm or check-in flows, join-success notification prompt, message-thread entry, and booking-support entry

## Error And Action Availability Contract

- command failure responses should converge on RFC 9457 `application/problem+json`
- HTTP status selection should follow RFC 9110 semantics
- each domain guard should publish one stable machine-readable code owned by the action's domain module
- `type` should be a stable problem URI and `code` should be a compact stable token that frontend can match directly
- `POST` / `PUT` handlers should return localized human-readable explanation through problem details while keeping machine codes stable across frontend and backend
- localized `title` and `detail` should be backend-owned and selected from request locale, with `Content-Language` set on the response
- action availability should use one dedicated batch preflight read contract rather than embedding central policy output into the main PR detail read
- preflight and command handlers should reuse the same action deciders and the same code registry
- the preferred preflight transport is `GET /api/pr/:id/actions/preflight`
- `OPTIONS` remains available for generic HTTP capability discovery and `HEAD` remains available for metadata-only reads; action availability lives on the dedicated `GET` contract

Minimal preflight response target:

- `evaluatedAt`
- `actions`
  - one entry per requested action
  - `allowed`
  - `problem`
    - `type`
    - `code`
    - `title`
    - `detail`
  - `nextRelevantAt`

Working implications:

- add a shared reason-code registry for `join`, `confirm`, `check-in`, booking-contact handoff, and related actions
- define precedence rules so each denied action returns one primary code in preflight
- keep richer explanation and extension fields on RFC 9457 command failures
- keep frontend ownership on button presentation, hidden versus disabled choice, and copy placement
- lift problem-details transport, action-decision transport, and action-presentation adapter shapes into a reusable cross-domain substrate; keep action names and code registries domain-owned

## Execution Policy Trade-off

Assessment target:

- whether confirmation, join-lock, check-in, booking-contact coordination, notification, and related reliability behavior should live across the `Partner` submodule plus adjacent resource owners

Working direction:

- `Partner` submodule keeps explicit optional feature facts for partner admission and attendance behavior such as confirmation, join-lock, and check-in.
- Booking-contact ownership and booking-trigger timing stay with booking resources and booking-support flows.
- Notification surfaces receive feature-specific registrations from the owning submodules, so notification UI grows by composition.
- Backend enforces availability on `POST` / `PUT` command paths. Frontend may call preflight reads to show or hide actions before the user commits an operation.

Design rules:

- create and update commands write the feature facts that the `Partner` submodule and adjacent owners actually carry
- command handlers own availability checks, invariant enforcement, and state transitions
- read models expose durable facts plus optional preflight hints
- feature-specific UI cards and prompts are registered by their owning submodules instead of routed through one central policy interpreter

Working implication for upcoming slices:

- Slice 2 and Slice 3 should target explicit feature storage for `Partner` and module-owned registrations rather than profile-oriented schema
- natural-language, structured form, and event-assisted create should all resolve into the same PR create payload, with feature facts written directly when present
- `booking_triggered_at` leaves PR storage and moves to booking-resource or booking-execution records
- confirm, join-lock, check-in, booking contact, and notification should each have a clear owner module and command surface

## Data Target

- keep `partner_requests` as the single durable PR table
- remove `pr_kind`
- merge PR-owned fields from `anchor_partner_requests` into `partner_requests`
- retire `anchor_partner_requests`
- retire `community_partner_requests`
- remove PR-side durable `anchorEventId` / `batchId`
- let `Anchor Event` keep one assisted PR create mode without becoming a prerequisite of PR existence, and let that mode reuse the canonical PR create command

Fields currently identified for relocation away from anchor-specific storage:

- `visibility_status`

Fields expected to live under the `Partner` submodule shape:

- `confirmation_start_offset_minutes`
- `confirmation_end_offset_minutes`
- `join_lock_offset_minutes`

Retirement target:

- `auto_hide_at`

Fields leaving PR core:

- `locationSource`
- `bookingHandledBy`

## Execution Slices

1. doc and contract rewrite for one single `PR` vocabulary + batch removal
2. implementation blueprint for the single-PR data model, including `partner_requests` as the root table, `Partner` submodule storage shape, subtype-table retirement path, and field retirement path for `auto_hide_at` and PR-side `booking_triggered_at`
3. schema expand and backfill scaffolding for one single PR model, including root-table expansion, partner admission fields, and compatibility bridges needed during rollout
4. non-destructive PR vocabulary cleanup, beginning with canonical PR create routes and hooks while old `cpr` and `apr` detail surfaces remain as compatibility seams
5. canonical PR read vocabulary cleanup across detail and partner-profile read surfaces while old `apr` and `cpr` detail pages remain as compatibility seams
6. rewrite Anchor Event assisted create and discovery around type and time-window facts, so `#170` lands as event-side assistance instead of PR-side ownership
7. backend domain rewrite from `pr-core` / `pr-anchor` / `pr-community` toward one `pr`, including `Partner`, `PR Message`, and `PR Sharing`
8. move PIN and WeChat user resolution helpers into `domains/user`
9. replace batch/event keyed PR reads with type/time-pool/discovery queries and reduce `partner-section-view.service.ts` into cleaner submodule reads
10. introduce shared action-availability and problem-details substrate, then wire `Partner` actions onto it
11. frontend PR type unification, action presentation reuse, and route/query cleanup
12. cleanup old repositories, controllers, use-cases, tables, and rollout bridges

## Repository Cleanup Target

- retire `apps/backend/src/domains/pr-anchor`
- retire `apps/backend/src/domains/pr-community`
- retire `AnchorPRRepository`
- retire `Anchor PR` and `Community PR` DTO / response names
- retire frontend `ANCHOR` / `COMMUNITY` PR model branching
- retire `/apr/*` and `/cpr/*` as canonical route families

## Slice Ownership For "Anchor PR 即 PR"

- Slice 5 established one canonical PR detail route and removed `CommunityPRPage` from the routed detail surface.
- Slice 6 resolves the last unstable event-side seams that still leak batch-specific or recovery-specific behavior into the public PR and event surfaces.
- Slice 7 carries the backend semantic rewrite from `pr-anchor` and `pr-community` toward one `pr` domain.
- Slice 11 carries the frontend rename sweep from `AnchorPR*` toward `PR*` on PR-owned pages, queries, and UI modules.
- Slice 12 removes the remaining compatibility seams, old controllers, old repositories, and deprecated route families.

## PRPage Carry-Over Branches

The single `PRPage` must continue carrying these still-valid branches while vocabulary and domain cleanup continue:

- draft publish
- creator quick actions
- partner join
- partner exit
- partner confirm
- partner check-in
- join-success notification prompt
- message-thread entry
- booking-support entry
## Current Unknowns To Resolve Early

- booking-support derivation after `anchorEventId` / `batchId` leave PR storage
- admin Anchor Event management flows that currently key by batch
- final discoverability query contract for the Anchor Event page
- rollout plan for legacy `/apr/*` and `/cpr/*` links

## Verification Target

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`
- targeted backend tests for PR creation, PR detail, partner section, and PR message reads
- targeted manual verification for Anchor Event page discovery and legacy route recovery if redirect bridges are kept

## Slice 1 - Doc And Contract Rewrite

- Status:
  - completed on 2026-04-21
- Durable docs updated:
  - `docs/10-prd/glossary.md`
  - `docs/10-prd/behavior/capabilities.md`
  - `docs/10-prd/behavior/scope.md`
  - `docs/10-prd/behavior/claims.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/domain-structure/cross-domain-interactions.md`
  - `docs/10-prd/domain-structure/derived-boundaries.md`
  - `docs/10-prd/_drivers/business-and-service-objectives.md`
  - `docs/10-prd/_drivers/hard-constraints.md`
  - `docs/10-prd/_drivers/operational-realities.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/claim-realization-matrix.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/unit-topology.md`
  - `docs/20-product-tdd/notification-contracts.md`
- Contract decisions recorded:
  - durable vocabulary converges on one single `PR`
  - canonical user-facing route family converges on `/pr/*`
  - canonical PR message route and API family converges on `/pr/:id/messages*`
  - canonical PR creation stays PR-owned
  - create commands split into `POST /api/pr/new/nl` and `POST /api/pr/new/form`
  - Anchor Event assisted create reuses the structured create payload and `POST /api/pr/new/form`
  - structured creation keeps arbitrary `type` input plus event-type suggestions, and keeps one resolved `time_window` with batch/free treated as UI modes
  - PR search contract converges on `GET /api/pr/search`
  - PRD and Product TDD remove `Community PR`, `Anchor PR`, `prKind`, and batch-centered PR wording
- Verification completed:
  - `rg -n "Community PR|Anchor PR|/apr\\b|/cpr\\b|prKind|pr_kind|batch" docs/10-prd` returned no matches
  - `rg -n "Community PR|Anchor PR|/apr\\b|/cpr\\b|prKind|pr_kind|batch" docs/20-product-tdd` returned no matches
- Verification gap:
  - runtime and compile-time verification remain part of later execution slices because Slice 1 changed durable docs only

## Slice 2 - Single PR Data Model Blueprint

- Status:
  - completed on 2026-04-22
- Artifact:
  - `tasks/pr-unification-167-170/20-single-pr-data-model-blueprint.md`
- Decisions recorded:
  - `partner_requests` remains the single PR root table
  - `visibility_status` moves to the PR root
    - confirmation and join-lock offsets move onto `partner_requests` while staying `Partner`-owned semantically
  - `pr_kind`, `anchor_event_id`, `batch_id`, `location_source`, `auto_hide_at`, and subtype-table identity all leave the PR durable model
  - `booking_triggered_at` leaves the PR model and is re-homed under booking-support-owned resource state
  - `raw_text` and `creation_source` leave the durable PR model and fall back to acquisition / analytics / operation-log concerns
  - booking-support runtime reads stay PR-keyed, while event/batch inputs remain transient during the compatibility window
- Verification completed:
  - root, subtype, partner, booking-support, and booking-trigger current storage were re-read from backend entity and service files before finalizing the blueprint
  - blast-radius scan covered current field usage for `prKind`, anchor subtype fields, batch/event keys, and booking-trigger paths
- Verification gap:
  - no schema or code was changed in this slice, so runtime verification remains part of Slice 3 and later execution slices

## Slice 3 - Schema Expand And Compatibility Write Bridge

- Status:
  - completed on 2026-04-22
- Schema artifacts:
  - `apps/backend/drizzle/0024_single_pr_expand.sql`
  - `apps/backend/src/entities/partner-request.ts`
- Local repair artifact:
  - `tasks/pr-unification-167-170/21-local-db-realign-after-0024-rewrite.sql`
- Compatibility write artifacts:
  - `apps/backend/src/repositories/AnchorPRRepository.ts`
  - `apps/backend/src/repositories/PartnerRequestRepository.ts`
  - `apps/backend/src/repositories/PRRootRepository.ts`
  - `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-pr.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts`
  - `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts`
- Decisions implemented:
  - `partner_requests.visibility_status` is added with default `VISIBLE`
  - partner admission offsets are added directly onto `partner_requests`
  - backfill from `anchor_partner_requests` populates root visibility and partner admission offsets
  - anchor compatibility writes now dual-write old anchor subtype fields and new root fields while old anchor subtype reads remain in place
  - direct transactional anchor create paths now populate the new root fields directly
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend db:lint`
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
- Verification gap:
  - runtime read-switch verification remains for later slices

## Slice 4 - Canonical PR Create Vocabulary Cleanup

- Status:
  - completed on 2026-04-22
- Scope for this narrowed slice:
  - add canonical backend create commands under `/api/pr/new/*`
  - add canonical frontend create route `/pr/new`
  - introduce generic `PR` create hooks and create flow names
  - keep `CommunityPR` detail, publish, and compatibility route surfaces in place
  - defer recovery-lane replacement until the post-`#170` time-window recommendation model is defined
- Artifacts:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/frontend/src/domains/pr/queries/usePRCreate.ts`
  - `apps/frontend/src/domains/pr/use-cases/usePRCreateFlow.ts`
  - `apps/frontend/src/domains/pr/use-cases/useCommunityPRCreateFlow.ts`
  - `apps/frontend/src/pages/CommunityPRCreatePage.vue`
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/pages/HomePage.vue`
  - `apps/frontend/src/domains/landing/ui/sections/LandingHeroSection.vue`
  - `apps/frontend/src/domains/share/use-cases/useRouteShareOrchestrator.ts`
  - `apps/frontend/src/shared/telemetry/events.ts`
- Decisions implemented:
  - canonical create commands now live at `POST /api/pr/new/form` and `POST /api/pr/new/nl`
  - frontend create hooks now center on `PR` vocabulary and call the canonical `/api/pr/new/*` endpoints
  - `/pr/new` is now the canonical create page route while `/cpr/new` remains as a compatibility alias
  - home and landing create entry points now navigate to `pr-create`
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - `CommunityPR` and `AnchorPR` detail surfaces still exist and remain the next cleanup surface

## Slice 5 - Canonical PR Read Vocabulary Cleanup

- Status:
  - completed on 2026-04-22
- Scope for this narrowed slice:
  - add canonical backend detail and partner-profile read endpoints under `/api/pr/:id*`
  - add generic frontend read hooks for PR detail and partner profile
  - keep existing `apr` and `cpr` detail routes, pages, and queries as compatibility seams
- Artifacts:
  - `apps/backend/src/domains/pr-core/use-cases/get-pr-detail.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-pr-partner-profile.ts`
  - `apps/backend/src/domains/pr-core/use-cases/index.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/frontend/src/pages/AnchorPRPage.vue`
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
  - `apps/frontend/src/domains/pr/queries/useCommunityPR.ts`
  - `apps/frontend/src/domains/pr/queries/usePRDetail.ts`
  - `apps/frontend/src/domains/pr/routing/routes.ts`
  - `apps/frontend/src/domains/pr/use-cases/useSharedPRActions.ts`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRRecoveryLane.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`
  - `apps/frontend/src/domains/pr/ui/primitives/AnchorPRSearchResultCard.vue`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventPRCard.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorPRSearchPage.vue`
  - `apps/frontend/src/pages/AnchorPRMessagesPage.vue`
  - `apps/frontend/src/pages/AnchorPRBookingSupportPage.vue`
  - `apps/frontend/src/pages/UserProfilePage.vue`
  - `apps/frontend/src/domains/share/use-cases/useRouteShareOrchestrator.ts`
  - `apps/frontend/src/shared/api/query-keys.ts`
- Decisions implemented:
  - canonical detail read now lives at `GET /api/pr/:id`
  - canonical partner profile read now lives at `GET /api/pr/:id/partners/:partnerId/profile`
  - backend canonical read dispatch chooses the legacy anchor or community detail use case from root PR facts
  - partner profile lookup no longer requires frontend callers to branch on `prKind`
  - frontend now has a generic `usePRDetail` hook and a generic partner profile fetch path
  - canonical frontend detail route now lives at `/pr/:id`
  - `/pr/:id` now renders the single PR detail page directly through `AnchorPRPage.vue`
  - old `/cpr/:id` detail links now redirect into `/pr/:id`
  - `/apr/:id` and `/pr/:id` now share the same page implementation
  - `CommunityPRPage.vue` has been retired from the routed detail surface
  - existing `useAnchorPR` and `useCommunityPR` detail hooks now read through `GET /api/pr/:id` and keep kind-specific compatibility checks locally where anchor-only or community-only mutations still exist
  - canonical create flows now navigate to `/pr/:id`, so newly created PRs enter the canonical route family immediately
  - generic detail cache invalidation now happens alongside legacy anchor/community detail cache invalidation
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - backend canonical detail still dispatches to legacy anchor and community detail builders
  - `apr` alias routes and anchor-only subpages such as messages and booking support still carry legacy naming

## Slice 6A - Event-Assisted Create And Discovery Bridge

- Status:
  - completed on 2026-04-22
- Scope for this narrowed slice:
  - make canonical `/api/pr/new/form` and `/api/pr/new/nl` auth-aware, so authenticated create publishes immediately and anonymous create returns `DRAFT`
  - switch Anchor Event assisted create onto the canonical structured create command
  - start event discovery migration from anchor subtype reads toward root PR reads keyed by `event.type + time_window`
  - keep recovery-lane replacement and full batch-shell removal for a later Slice 6B
- Artifacts:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr.shared.ts`
  - `apps/backend/src/domains/pr-core/services/pr-read.service.ts`
  - `apps/backend/src/repositories/PartnerRequestRepository.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
  - `apps/backend/src/domains/anchor-event/services/demand-card-projection.service.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/join-demand-card.ts`
  - `apps/backend/src/infra/events/event-types.ts`
  - `apps/frontend/src/domains/pr/queries/usePRCreate.ts`
  - `apps/frontend/src/domains/pr/use-cases/usePRCreateFlow.ts`
  - `apps/frontend/src/domains/pr/ui/forms/NLPRForm.vue`
  - `apps/frontend/src/domains/pr/ui/sections/InlineNLPRForm.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRCreateFooterActions.vue`
  - `apps/frontend/src/pages/CommunityPRCreatePage.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorPRPage.vue`
  - `apps/frontend/src/domains/event/model/demand-cards.ts`
  - `apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.ts`
  - `apps/frontend/src/domains/event/queries/useCreateUserAnchorPR.ts`
  - `apps/frontend/src/processes/wechat/pending-wechat-action.ts`
- Decisions implemented:
  - canonical create commands now return create result state, so authenticated create paths can land directly on an already-published `/pr/:id`
  - authenticated `/api/pr/new/form` and `/api/pr/new/nl` create and publish inside one backend-owned flow, while anonymous create continues to return `DRAFT`
  - Anchor Event assisted create now submits the same structured PR payload plus transient assisted-create context through `/api/pr/new/form`
  - backend enforces authenticated identity for event-assisted create and keeps that requirement aligned with direct `OPEN` creation
  - Anchor Event page no longer falls back to community-specific create behavior
  - event detail and demand-card discovery now start from root PR reads keyed by `event.type + time_window`, then apply event-owned location constraints while batch shells remain as compatibility grouping artifacts
  - PR detail can preserve event referral context through `fromEvent` query state for back-navigation continuity without reintroducing durable PR-side event identity
  - old batch-specific event create route and batch-shaped demand discovery remain compatibility seams for later cleanup
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - these remaining public-surface compatibility seams moved into Slice 6B

## Slice 6B - Event Public Surface Contraction

- Status:
  - completed on 2026-04-22
- Scope for this narrowed slice:
  - remove recovery-lane behavior from the public PR detail surface
  - remove old public batch-specific event create and demand-card join seams
  - contract public Anchor Event detail from batch-shaped grouping into time-window discovery
- Artifacts:
  - `apps/backend/src/controllers/anchor-event.controller.ts`
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/domains/anchor-event/services/demand-card-projection.service.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/index.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/index.ts`
  - `apps/backend/src/index.ts`
  - `apps/frontend/src/domains/event/model/types.ts`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventPRCard.vue`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorPRCreateCard.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventListModeSection.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/pages/AnchorPRPage.vue`
  - `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
  - `apps/frontend/src/domains/event/queries/useCreateUserAnchorPR.ts`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRRecoveryLane.vue`
- Decisions implemented:
  - public Anchor Event detail now emits `timeWindows` instead of batch-shaped public group shells
  - public event discovery and card-mode demand projection now derive candidate PRs from `event.type + time_window` plus event-owned location constraints
  - old public batch-specific event create route has been removed, so event-assisted create now goes only through the canonical structured PR create command
  - old public demand-card join route has been removed
  - public PR detail no longer exposes the recovery lane or alternative-batch acceptance path
  - anchor detail compatibility still keeps empty related arrays in the response shape until later contract cleanup
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - admin Anchor Event management and other private compatibility code still retain batch-oriented internals
  - backend anchor detail responses still carry legacy compatibility fields that are no longer used by the public page

## Handoff Source

This packet spins out of:

- `tasks/domain-structure-code-doc-review/00-task-packet.md`
- `tasks/domain-structure-code-doc-review/40-pr-core-dossier.md`

## LLD Artifacts

- `tasks/pr-unification-167-170/10-action-preflight-problem-details-lld.md`
- `tasks/pr-unification-167-170/20-single-pr-data-model-blueprint.md`
