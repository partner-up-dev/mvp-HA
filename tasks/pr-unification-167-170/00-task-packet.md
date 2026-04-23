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

## Compatibility Shell Trade-off Map

- retire early, because the canonical owner already exists and the shell only adds indirection
  - `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/search-anchor-prs.ts`
  - `apps/backend/src/domains/pr-community/use-cases/get-community-pr.ts`
- keep temporarily, because live route or mutation compatibility still exists
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/controllers/community-pr.controller.ts`
  - `apps/backend/src/domains/pr-community/use-cases/join-community-pr.ts`
  - `apps/backend/src/domains/pr-community/use-cases/exit-community-pr.ts`
  - old `/apr/*` and `/cpr/*` route families
- move ownership now, then keep thin re-export shells during the transition
  - `pr-core/use-cases/list-pr-messages.ts`
  - `pr-core/use-cases/create-pr-message.ts`
  - `pr-core/use-cases/advance-pr-message-read-marker.ts`
  - `pr-core/services/pr-view.service.ts`
  - `pr-core/services/pr-share-metadata.service.ts`
- defer, because the business shape is still coupled to later slices
  - `pr-core/services/partner-section-view.service.ts`
  - `pr-core/services/anchor-participation-policy.service.ts`
  - booking-support compatibility surfaces
  - admin batch-oriented Anchor Event internals

## Compatibility Retention Cost Map

- keep `apps/backend/src/controllers/anchor-pr.controller.ts`
  - value:
    - preserves live `/apr/*` mutation and message route compatibility
    - keeps anchor-only action surfaces stable while canonical `/pr/*` mutation routes are still incomplete
  - cost:
    - keeps Anchor PR naming alive in controller and DTO vocabulary
    - adds one extra protocol surface whenever PR message or booking-support behavior changes
- keep `apps/backend/src/controllers/community-pr.controller.ts`
  - value:
    - preserves live `/cpr/*` publish, join, and exit compatibility
    - keeps rollout pressure low while community-specific mutation behavior still exists
  - cost:
    - keeps Community PR wording and legacy credential behavior reachable
    - slows the final cut required by issue `#167`
- keep `apps/backend/src/domains/pr-community/use-cases/join-community-pr.ts` and `exit-community-pr.ts`
  - value:
    - isolates the remaining community-specific mutation behavior behind a small seam
  - cost:
    - extends old terminology and legacy auth assumptions
- keep `/apr/*` and `/cpr/*` route families
  - value:
    - preserves shared-link and bookmarked-link compatibility
  - cost:
    - duplicates route families and telemetry naming pressure
    - delays final vocabulary convergence on `/pr/*`
- remove read-model shells under `pr-anchor/use-cases` and `pr-community/use-cases`
  - value:
    - no live behavior is lost because canonical `domains/pr/read-models/*` already owns the implementation
    - the import graph becomes shallower and the compatibility surface becomes more honest
  - cost:
    - any consumer importing those exact file paths would break, so the cut requires an import scan first

## Compatibility Decision Table

| Surface | Current role | Recommended retention horizon | Canonical replacement | Removal preconditions | Removal order |
| --- | --- | --- | --- | --- | --- |
| frontend `/apr/:id` | detail alias that still renders the single PR page | short | `/pr/:id` | telemetry and shared-link generation stop emitting `/apr/*`; old inbound links are acceptable through redirect | 3 |
| frontend `/apr/:id/messages` | only live route for PR message page | medium | `/pr/:id/messages` | add canonical PR messages page route and move frontend route helpers off `anchorPRMessagesPath` | 5 |
| frontend `/apr/:id/booking-support` | only live route for PR booking-support page | medium | `/pr/:id/booking-support` | add canonical PR booking-support page route and move frontend route helpers off `anchorPRBookingSupportPath` | 6 |
| frontend `/apr/:id/partners/:partnerId` | anchor partner profile path used by roster and awareness UI | short to medium | `/pr/:id/partners/:partnerId` | add canonical PR partner profile route and remove `prKind`-based path branching in frontend components | 4 |
| frontend `/cpr/:id` | redirect alias into `/pr/:id` | short | `/pr/:id` | confirm no product surface still emits `/cpr/:id`; keep server-side redirect only if link compatibility still matters | 2 |
| frontend `/cpr/new` | create-page alias into the same PR create page | short | `/pr/new` | home, landing, share, and event surfaces all emit `/pr/new`; link compatibility decision made explicitly | 1 |
| frontend `/cpr/:id/partners/:partnerId` | community-specific partner profile path | medium | `/pr/:id/partners/:partnerId` | add canonical PR partner profile route and remove `communityPRPartnerProfilePath` calls | 4 |
| backend `/api/apr` via `anchor-pr.controller.ts` | anchor-only read, message, booking-support, join, exit, confirm, and check-in surface | medium | split across `/api/pr/:id*` and event-side routes where needed | canonical PR message, booking-support, join, exit, confirm, check-in, and search APIs exist; frontend no longer calls `/api/apr/*` | 8 |
| backend `/api/cpr` via `community-pr.controller.ts` | legacy community create, publish, detail, partner-profile, join, exit, and update surface | short to medium | `/api/pr/new/*`, `/api/pr/:id`, `/api/pr/:id/partners/:partnerId/profile`, plus new canonical publish and mutation commands | canonical PR publish, join, exit, and update APIs exist; legacy auth payload behavior is either retired or intentionally preserved elsewhere | 7 |
| `community-pr.controller.ts` | protocol shell for the remaining community-specific API behavior | short to medium | `partner-request.controller.ts` plus canonical PR mutation controllers | same as `/api/cpr`; no frontend RPC client still imports community controller routes | 7 |
| `join-community-pr.ts` | last seam that still provisions local users and generated PIN during community join | short | canonical `joinPR` command with the final identity policy | issue `#175` outcome applied; anonymous join semantics are either removed or redefined under canonical PR policy | 9 |

Decision notes:

- `/cpr/:id` and `/cpr/new` have the lowest retention value because they already map onto canonical PR page surfaces.
- `/apr/*` retains more value because messages, booking-support, and partner-profile still lack canonical `/pr/*` route surfaces.
- `community-pr.controller.ts` and `join-community-pr.ts` are coupled to the legacy local-credential path, so their removal should be coordinated with issue `#175`.
- `anchor-pr.controller.ts` should stay until canonical PR mutation and subpage APIs exist. Its read-only detail/search compatibility value is already much lower than its mutation and subpage value.

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

## Slice 7A - Backend Canonical PR Domain Entry Surface

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - introduce backend canonical `domains/pr` entrypoints and sub-namespaces
  - switch controller and legacy facade imports onto that canonical PR surface
  - keep old `pr-core`, `pr-anchor`, and `pr-community` folders as compatibility internals during the transition
- Artifacts:
  - `apps/backend/src/domains/pr/index.ts`
  - `apps/backend/src/domains/pr/model/pr/index.ts`
  - `apps/backend/src/domains/pr/model/partner/index.ts`
  - `apps/backend/src/domains/pr/message/index.ts`
  - `apps/backend/src/domains/pr/sharing/index.ts`
  - `apps/backend/src/domains/pr/read-models/index.ts`
  - `apps/backend/src/domains/pr/services/index.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/controllers/community-pr.controller.ts`
  - `apps/backend/src/services/PartnerRequestService.ts`
  - `apps/backend/src/domains/pr-core/index.ts`
  - `apps/backend/src/domains/pr-anchor/index.ts`
  - `apps/backend/src/domains/pr-community/index.ts`
- Decisions implemented:
  - backend now has one canonical `domains/pr` import surface with `model/pr`, `model/partner`, `message`, `sharing`, `read-models`, and `services` namespaces
  - PR-owned backend controllers now import canonical PR use-cases from `domains/pr` rather than directly from `pr-core`, `pr-anchor`, or `pr-community`
  - the legacy `PartnerRequestService` facade now delegates to `domains/pr`
  - old split domain indices are now explicitly marked as compatibility entrypoints
  - identity helpers for PIN and WeChat user resolution remain in their current files until Slice 8 moves them into `domains/user`
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `rg -n "../domains/pr-core|../domains/pr-anchor|../domains/pr-community|domains/pr-core|domains/pr-anchor|domains/pr-community" apps/backend/src/controllers apps/backend/src/services apps/backend/src` now leaves only auth and wechat identity-helper imports for the planned Slice 8 move
- Verification gap:
  - internal use-case and service files still physically live under `pr-core`, `pr-anchor`, and `pr-community`
  - controller route names and response DTO names still carry legacy `Anchor PR` / `Community PR` wording where compatibility remains necessary

## Slice 8A - Identity Helper Move To User Domain

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - move PIN helper and WeChat openId user-resolution helper into `domains/user`
  - switch backend controllers and PR-related domain code to import those helpers from the user domain
  - keep old `pr-core` helper files as compatibility re-export seams during the transition
- Artifacts:
  - `apps/backend/src/domains/user/index.ts`
  - `apps/backend/src/domains/user/services/index.ts`
  - `apps/backend/src/domains/user/services/user-pin-auth.service.ts`
  - `apps/backend/src/domains/user/services/user-resolver.service.ts`
  - `apps/backend/src/controllers/auth.controller.ts`
  - `apps/backend/src/controllers/wechat.controller.ts`
  - `apps/backend/src/domains/user/use-cases/register-local-user.ts`
  - `apps/backend/src/domains/anchor-event/use-cases/create-user-anchor-pr.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
  - `apps/backend/src/domains/pr-community/use-cases/get-community-pr.ts`
  - `apps/backend/src/domains/pr-community/use-cases/join-community-pr.ts`
  - `apps/backend/src/domains/pr-core/use-cases/check-in.ts`
  - `apps/backend/src/domains/pr-core/use-cases/confirm-slot.ts`
  - `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-pr.ts`
  - `apps/backend/src/domains/pr-core/use-cases/join-pr.ts`
  - `apps/backend/src/domains/pr-core/use-cases/publish-pr.ts`
  - `apps/backend/src/domains/pr-core/services/creator-identity.service.ts`
  - `apps/backend/src/domains/pr-core/services/creator-mutation-auth.service.ts`
  - `apps/backend/src/domains/pr-core/services/user-pin-auth.service.ts`
  - `apps/backend/src/domains/pr-core/services/user-resolver.service.ts`
- Decisions implemented:
  - backend now has a canonical `domains/user` export surface for PIN helper and WeChat openId user resolution
  - auth controller, wechat controller, and PR-related domain code now import those helpers from `domains/user`
  - old `pr-core/services/user-pin-auth.service.ts` and `pr-core/services/user-resolver.service.ts` remain as compatibility re-export seams
  - current PIN and local-credential behavior remains unchanged in this slice; only ownership and import surface moved
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `rg -n "user-pin-auth|user-resolver|ensureUserHasPin|verifyUserPin|createLocalUserWithGeneratedPin|resolveUserByOpenId" apps/backend/src` now shows canonical user-domain ownership plus the planned compatibility re-export seams
- Verification gap:
  - publish-time PIN generation and legacy local-credential behavior remain active and still require a later product/identity cleanup slice

## Slice 7B - Canonical PR Read-Model Ownership Move

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - move legacy anchor/community PR read-model implementations into canonical `domains/pr/read-models`
  - keep old `pr-anchor` and `pr-community` read-model files as compatibility re-export shells
  - point canonical PR detail dispatch at the new canonical read-model files
- Artifacts:
  - `apps/backend/src/domains/pr/read-models/get-anchor-pr-detail.ts`
  - `apps/backend/src/domains/pr/read-models/get-community-pr-detail.ts`
  - `apps/backend/src/domains/pr/read-models/search-anchor-prs.ts`
  - `apps/backend/src/domains/pr/read-models/index.ts`
  - `apps/backend/src/domains/pr-core/use-cases/get-pr-detail.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
  - `apps/backend/src/domains/pr-anchor/use-cases/search-anchor-prs.ts`
  - `apps/backend/src/domains/pr-community/use-cases/get-community-pr.ts`
- Decisions implemented:
  - canonical `domains/pr/read-models` now owns `getAnchorPRDetail`, `getCommunityPRDetail`, and `searchAnchorPRs`
  - `getPRDetail` now dispatches to the canonical PR read-model files instead of importing from split anchor/community domain folders
  - old `pr-anchor` and `pr-community` read-model files remain in place only as compatibility re-export seams
  - route shape and response shape remain unchanged in this slice
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
- Verification gap:
  - read-model internals still depend on legacy subtype repositories and compatibility fields such as `prKind`, `anchorEventId`, and `batchId`
  - controller route names and DTO vocabulary still carry anchor/community wording where compatibility remains active

## Slice 7C - Canonical PR Message And Share Ownership Move

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - move PR message use-cases into canonical `domains/pr/message`
  - move public PR view and canonical share metadata services into canonical `domains/pr`
  - keep `pr-core` message and share files as thin compatibility re-export shells
  - keep route and response shapes stable while shrinking `pr-core` ownership
- Artifacts:
  - `apps/backend/src/domains/pr/message/index.ts`
  - `apps/backend/src/domains/pr/message/list-pr-messages.ts`
  - `apps/backend/src/domains/pr/message/create-pr-message.ts`
  - `apps/backend/src/domains/pr/message/advance-pr-message-read-marker.ts`
  - `apps/backend/src/domains/pr/read-models/index.ts`
  - `apps/backend/src/domains/pr/read-models/public-pr-view.service.ts`
  - `apps/backend/src/domains/pr/sharing/index.ts`
  - `apps/backend/src/domains/pr/sharing/pr-share-metadata.service.ts`
  - `apps/backend/src/domains/pr-core/use-cases/list-pr-messages.ts`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-message.ts`
  - `apps/backend/src/domains/pr-core/use-cases/advance-pr-message-read-marker.ts`
  - `apps/backend/src/domains/pr-core/services/pr-view.service.ts`
  - `apps/backend/src/domains/pr-core/services/pr-share-metadata.service.ts`
  - `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-pr-message.ts`
  - `apps/backend/src/domains/pr/read-models/get-anchor-pr-detail.ts`
  - `apps/backend/src/domains/pr/read-models/get-community-pr-detail.ts`
- Decisions implemented:
  - canonical `domains/pr/message` now owns message thread listing, message creation, system-message persistence, and read-marker advancement
  - canonical `domains/pr/read-models/public-pr-view.service.ts` now owns `PublicPR` and `toPublicPR`
  - canonical `domains/pr/sharing/pr-share-metadata.service.ts` now owns share metadata generation
  - old `pr-core` message and share files remain as compatibility re-export shells
  - admin Anchor PR message creation now imports canonical PR message ownership directly
  - canonical PR share metadata now emits `/pr/:id` as the canonical share path
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `rg -n 'pr-core/use-cases/list-pr-messages|pr-core/use-cases/create-pr-message|pr-core/use-cases/advance-pr-message-read-marker|pr-core/services/pr-view.service|pr-core/services/pr-share-metadata.service' apps/backend/src` returned no direct ownership imports outside the compatibility shells themselves
- Verification gap:
  - deeper `pr-core` internal callers still import the compatibility shells and remain candidates for a later cleanup slice

## Slice 7D - Remove Obsolete Read-Model Compatibility Shells

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - delete `pr-anchor` and `pr-community` read-model files that only re-export canonical implementations
  - retarget compatibility namespace indices directly to canonical `domains/pr/read-models/*`
  - record the remaining route and controller compatibility retention costs explicitly
- Artifacts:
  - `apps/backend/src/domains/pr-anchor/use-cases/index.ts`
  - `apps/backend/src/domains/pr-community/use-cases/index.ts`
  - deleted:
    - `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
    - `apps/backend/src/domains/pr-anchor/use-cases/search-anchor-prs.ts`
    - `apps/backend/src/domains/pr-community/use-cases/get-community-pr.ts`
- Decisions implemented:
  - obsolete read-model shells under `pr-anchor` and `pr-community` are removed
  - compatibility namespace indices now point directly at canonical `domains/pr/read-models/*`
  - route-level and mutation-level compatibility stays in place, and its retention trade-offs are now documented separately
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `rg -n "pr-anchor/use-cases/get-anchor-pr|pr-anchor/use-cases/search-anchor-prs|pr-community/use-cases/get-community-pr" apps/backend/src` returned no remaining source references
- Verification gap:
  - route and controller compatibility plus community-specific mutation compatibility remain for later slices

## Slice 7E - Canonical PR Subpage Route And API Unlock

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - add canonical `/api/pr/:id/*` endpoints for PR messages and PR booking-support subpages
  - add canonical frontend `/pr/:id/*` subpage routes for partner profile, messages, and booking support
  - keep `/apr/*` and `/cpr/*` as redirect aliases while internal path emission converges on `/pr/*`
- Artifacts:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/domains/pr/routing/routes.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPRMessages.ts`
  - `apps/frontend/src/domains/user/queries/usePRPartnerProfile.ts`
  - `apps/frontend/src/pages/UserProfilePage.vue`
  - `apps/frontend/src/pages/AnchorPRMessagesPage.vue`
  - `apps/frontend/src/pages/AnchorPRBookingSupportPage.vue`
  - `apps/frontend/src/shared/api/query-keys.ts`
  - `apps/frontend/src/domains/pr/model/detail.ts`
  - `apps/frontend/src/domains/pr/model/types.ts`
  - `apps/frontend/src/locales/schema.ts`
  - `apps/frontend/src/locales/zh-CN.jsonc`
- Decisions implemented:
  - canonical backend PR controller now serves `/api/pr/:id/messages`, `/api/pr/:id/messages/read-marker`, `/api/pr/:id/booking-support`, `/api/pr/:id/booking-contact/phone`, and `/api/pr/:id/reimbursement/status`
  - canonical frontend routes now include `/pr/:id/partners/:partnerId`, `/pr/:id/messages`, and `/pr/:id/booking-support`
  - old `/apr/*` partner-profile, messages, and booking-support routes now redirect to canonical `/pr/*`
  - old `/cpr/:id/partners/:partnerId` now redirects to canonical `/pr/*`
  - route helper emission now converges on canonical `/pr/*` paths even when legacy helper names are still imported
  - frontend PR message and booking-support queries now call canonical `/api/pr/*` endpoints and share canonical query keys
  - user profile page subtitle is now generic PR vocabulary
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - `/apr/:id` and `/cpr/new` still remain as compatibility routes
  - share-surface pathname classification still contains `/apr/*` and `/cpr/*` assumptions and should be cleaned in a later slice

## Slice 7F - Share Surface Canonical Path Inference Cleanup

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - remove share-surface telemetry and share-link logic that infers PR kind from `/apr/*` and `/cpr/*` pathname prefixes
  - switch that inference to explicit route/share metadata while keeping PR id parsing compatible with alias paths
- Artifacts:
  - `apps/frontend/src/domains/share/use-cases/useShareCarousel.ts`
  - `apps/frontend/src/domains/share/use-cases/as-link/useShareAsLink.ts`
  - `apps/frontend/src/domains/share/ui/composites/PRShareCarousel.vue`
- Decisions implemented:
  - share carousel now derives `prKind` telemetry enrichment from `spmRouteKey` instead of current pathname aliases
  - share-as-link now derives `prKind` telemetry enrichment from `spmRouteKey` instead of share URL pathname aliases
  - PR id parsing remains compatibility-tolerant through `parsePRIdFromPathname`, so old alias links still work
- Verification completed:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `rg -n 'startsWith\\(\"/apr/\"\\)|startsWith\\(\"/cpr/\"\\)|/apr/|/cpr/' apps/frontend/src/domains/share` returned no remaining share-surface pathname assumptions
- Verification gap:
  - route-share fallback naming still contains anchor/community route keys and remains part of a later vocabulary cleanup slice

## Telemetry Vocabulary Decision Map

| Telemetry residue | Current role | Decision | Follow-up target |
| --- | --- | --- | --- |
| share telemetry field `prKind` | legacy subtype analytics field on share method, share link, and share lifecycle events | retire now | use `prId`, `spm`, `routeSessionId`, and `revision` for share analysis |
| share lifecycle field `entityKey` | route-share replay and stale-descriptor debugging key | keep temporarily | converge later on a generic PR entity key once route-share descriptor vocabulary is rewritten |
| `anchor_pr_primary_cta_impression` | primary CTA impression on the unified PR page | rename later | `pr_primary_cta_impression` |
| `anchor_pr_primary_cta_click` | primary CTA click on the unified PR page | rename later | `pr_primary_cta_click` |
| `anchor_pr_lane_expand` | secondary lane expansion on the unified PR page | rename later | `pr_lane_expand` |
| `anchor_pr_recovery_accept` | recovery-lane action telemetry | retire with the remaining recovery compatibility cleanup | none |
| `anchor_pr_secondary_action_click` | secondary action telemetry, including share-trigger taps | rename later | `pr_secondary_action_click` |
| `community_pr_*` event family | not present as a real analytics family; only route/share keys and old paths remain | no telemetry event rename needed | continue route-key and alias cleanup in later slices |

## Slice 7G - Share Telemetry Vocabulary Cleanup

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - remove `prKind` from share telemetry payloads and route-share lifecycle telemetry
  - keep the existing `anchor_pr_*` event family as temporary vocabulary, while documenting its rename or retire path explicitly
  - keep share session and replay diagnostics stable during the cleanup
- Artifacts:
  - `apps/frontend/src/shared/telemetry/events.ts`
  - `apps/frontend/src/domains/share/use-cases/route-share-controller.ts`
  - `apps/frontend/src/domains/share/use-cases/useShareCarousel.ts`
  - `apps/frontend/src/domains/share/use-cases/as-link/useShareAsLink.ts`
  - `apps/frontend/src/shared/wechat/useWeChatShare.ts`
- Decisions implemented:
  - `share_method_switch`, `share_link_*`, and `share_*` lifecycle events no longer accept or emit `prKind`
  - route-share lifecycle telemetry now extracts only `prId` from descriptor `entityKey` and leaves subtype inference behind
  - WeChat share replay telemetry follows the same rule, so `prKind` has left both browser-share and WeChat-share payloads
  - share-triggered `anchor_pr_secondary_action_click` remains temporarily in place, but its payload no longer carries `prKind`
  - telemetry rename and retire follow-up work is now tracked in the decision map above
- Verification completed:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `rg -n "prKind" apps/frontend/src/shared/telemetry apps/frontend/src/domains/share apps/frontend/src/shared/wechat` now leaves only PR-page telemetry type support outside the share stack
- Verification gap:
  - `anchor_pr_*` event names still remain on unified PR page interactions and need a later rename slice after route and page vocabulary finish converging

## Slice 7H - Canonical PR Mutation Unlock

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - add canonical `/api/pr/:id/*` mutation routes for publish, status, content, join, exit, confirm, and check-in
  - switch frontend PR mutation hooks from `/api/apr/*` and `/api/cpr/*` to canonical `/api/pr/*`
  - keep `anchor-pr.controller.ts` and `community-pr.controller.ts` as compatibility shells while canonical mutation traffic moves away from them
- Artifacts:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
  - `apps/frontend/src/domains/pr/queries/useCommunityPR.ts`
- Decisions implemented:
  - canonical PR controller now owns `POST /api/pr/:id/publish`
  - canonical PR controller now owns `PATCH /api/pr/:id/status` and `PATCH /api/pr/:id/content`
  - canonical PR controller now owns `POST /api/pr/:id/join`, `POST /api/pr/:id/exit`, `POST /api/pr/:id/confirm`, and `POST /api/pr/:id/check-in`
  - canonical join and exit routes preserve current behavior by branching on existing PR kind at the controller boundary, so community-specific auth behavior and anchor-specific WeChat behavior stay stable during the transition
  - canonical content mutation preserves the current anchor/community content shape difference at the controller boundary, so frontend hooks can move first while subtype-specific payload differences remain localized
  - frontend anchor and community mutation hooks now emit canonical `/api/pr/*` requests
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - `anchor-pr.controller.ts` and `community-pr.controller.ts` still exist as live compatibility route shells
  - frontend and backend symbol names still retain `AnchorPR*` and `CommunityPR*` vocabulary around those hooks and controllers

## Slice 7I - Controller Compatibility Shell Contraction

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - remove the now-unused `/api/cpr` controller surface
  - contract `/api/apr` down to the still-live search endpoint
  - move remaining frontend detail type anchors off `/api/cpr/:id` and `/api/apr/:id`
- Artifacts:
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/controllers/community-pr.controller.ts`
  - `apps/backend/src/index.ts`
  - `apps/frontend/src/domains/pr/model/detail.ts`
  - `apps/frontend/src/domains/pr/model/types.ts`
- Decisions implemented:
  - `/api/cpr` is no longer mounted, so community-controller compatibility routes have left the live backend surface
  - `community-pr.controller.ts` has been removed
  - `/api/apr` now keeps only `GET /api/apr/search`, because frontend still uses that search contract
  - frontend PR detail type anchors now point at canonical `GET /api/pr/:id`
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - `/api/apr/search` still remains as a live compatibility seam until PR search gets a canonical `/api/pr/search` replacement
  - frontend symbol names and page names still retain `AnchorPR*` and `CommunityPR*` vocabulary in several places

## Slice 7J - Canonical PR Search Unlock

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - add canonical `GET /api/pr/search`
  - move frontend anchor-PR search query usage onto canonical `/api/pr/search`
  - remove the last live `/api/apr` controller shell
- Artifacts:
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - `apps/backend/src/controllers/anchor-pr.controller.ts`
  - `apps/backend/src/index.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPRSearch.ts`
  - `apps/frontend/src/domains/pr/model/types.ts`
- Decisions implemented:
  - canonical PR controller now owns `GET /api/pr/search`
  - frontend anchor-event search flow now consumes canonical `/api/pr/search`
  - `anchor-pr.controller.ts` has been removed
  - `/api/apr` is no longer mounted on the backend
- Verification completed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
  - source scan confirms `client.api.apr` and `anchorPRRoute` are gone
- Verification gap:
  - frontend symbol names and page names still retain `AnchorPR*` vocabulary
  - query-key naming still contains `anchorPR.search` and can be cleaned in a later rename slice

## Slice 11A - Frontend PR-Owned Vocabulary Rename Sweep

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - rename the live PR-owned frontend page files from split `AnchorPR*` and `CommunityPR*` names toward canonical `PR*`
  - add canonical PR wrapper modules for message thread, roster modal, facts card, booking-support hooks, message hooks, publish hook, and attendance-actions hook
  - move the live create and message-entry imports onto canonical PR hook names while leaving deeper compatibility files in place
  - clean the live PR search query key naming from `anchorPR.search` to `pr.search`
- Artifacts:
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/pages/PRMessagesPage.vue`
  - `apps/frontend/src/pages/PRBookingSupportPage.vue`
  - `apps/frontend/src/pages/PRCreatePage.vue`
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
  - `apps/frontend/src/domains/pr/ui/modals/PRRosterModal.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRMessageThread.vue`
  - `apps/frontend/src/domains/pr/queries/usePRMessages.ts`
  - `apps/frontend/src/domains/pr/queries/usePRBookingSupport.ts`
  - `apps/frontend/src/domains/pr/queries/usePRPublish.ts`
  - `apps/frontend/src/domains/pr/use-cases/usePRAttendanceActions.ts`
  - `apps/frontend/src/domains/pr/use-cases/usePRCreateFlow.ts`
  - `apps/frontend/src/domains/pr/ui/forms/NLPRForm.vue`
  - `apps/frontend/src/domains/pr/ui/sections/InlineNLPRForm.vue`
  - `apps/frontend/src/domains/pr/queries/useAnchorPRSearch.ts`
  - `apps/frontend/src/shared/api/query-keys.ts`
- Decisions implemented:
  - canonical live page files are now `PRPage.vue`, `PRMessagesPage.vue`, `PRBookingSupportPage.vue`, and `PRCreatePage.vue`
  - router imports for the canonical `/pr/*` surfaces now point at those `PR*` page files directly
  - PR detail page now uses canonical `prMessagesPath`, `prBookingSupportPath`, and `usePublishPR`
  - PR messages and booking-support pages now import through canonical `usePR*` wrappers
  - natural-language create surfaces now import `useCreatePRFromNaturalLanguage` directly from `usePRCreate`
  - the live PR search query key now emits through `queryKeys.pr.search`
  - component-level `AnchorPR*` files remain as internal compatibility seams and no longer define the routed page vocabulary
- Verification completed:
  - `pnpm --filter @partner-up-dev/frontend build`
- Verification gap:
  - `useAnchorPR.ts`, `useCommunityPR.ts`, `useAnchorPRMessages.ts`, and several `AnchorPR*` component files still remain as compatibility seams
  - telemetry event names and some share descriptors still carry legacy anchor/community vocabulary and remain outside this slice

## Slice 11B - Frontend Compatibility Hook And Path Contraction

- Status:
  - completed on 2026-04-23
- Scope for this narrowed slice:
  - move live PR action consumers onto canonical `usePR*` wrappers
  - converge live partner-profile path consumers onto `prPartnerProfilePath`
  - contract detail cache ownership onto `queryKeys.pr.detail`
  - remove unused frontend route-helper alias exports now that live emission has converged
- Artifacts:
  - `apps/frontend/src/domains/pr/queries/usePRActions.ts`
  - `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
  - `apps/frontend/src/domains/pr/queries/useCommunityPR.ts`
  - `apps/frontend/src/domains/pr/routing/routes.ts`
  - `apps/frontend/src/domains/pr/use-cases/useSharedPRActions.ts`
  - `apps/frontend/src/domains/pr/use-cases/useAnchorAttendanceActions.ts`
  - `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
  - `apps/frontend/src/domains/pr/ui/modals/UpdatePRStatusModal.vue`
  - `apps/frontend/src/domains/pr/ui/composites/AnchorPRFactsCard.vue`
  - `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
  - `apps/frontend/src/domains/pr/ui/modals/PRRosterModal.vue`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRAwarenessLane.vue`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRNextStepLane.vue`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRPrimaryActionLane.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`
  - `apps/frontend/src/shared/api/query-keys.ts`
- Decisions implemented:
  - live join, exit, content-update, status-update, confirm, and check-in consumers now read through canonical `usePRActions` or `usePRAttendanceActions` surfaces
  - `useAnchorPR.ts` and `useCommunityPR.ts` now share canonical `queryKeys.pr.detail` ownership for detail invalidation
  - live partner-profile links now emit through `prPartnerProfilePath`
  - unused route-helper alias exports for `anchorPR*` and `communityPR*` paths have been removed from `routes.ts`
  - type-only imports in live PR UI moved away from split query files and toward canonical PR model types
- Verification completed:
  - `pnpm --filter @partner-up-dev/frontend build`
  - source scan confirms no remaining live consumer references to removed frontend route-helper aliases or split detail query keys
- Verification gap:
  - `useAnchorPR.ts` and `useCommunityPR.ts` still remain as compatibility hook files for anchor-only or community-only behavior and type guards
  - `AnchorPR*` component files still remain in the tree as compatibility-owned component shells and internal naming residue

## Handoff Source

This packet spins out of:

- `tasks/domain-structure-code-doc-review/00-task-packet.md`
- `tasks/domain-structure-code-doc-review/40-pr-core-dossier.md`

## LLD Artifacts

- `tasks/pr-unification-167-170/10-action-preflight-problem-details-lld.md`
- `tasks/pr-unification-167-170/20-single-pr-data-model-blueprint.md`
