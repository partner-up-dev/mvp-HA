# L0 Plan: Split Anchor PR and Community PR

## Stage Goal

Analyze the current codebase and constraints before proposing architecture.
This stage does not define the final solution yet; it establishes what is coupled today, what can be reused, and which trade-off must be settled before L1.

## User Intent

Split Anchor PR and Community PR into:

- different pages
- different tables
- still sharing reusable components
- still sharing the Partner mechanism

Constraints from the task:

- follow the minimal principle
- keep abstractions composable for future domains
- support future extraction of economy/resource-booking into independent domains
- refactor from domain model down to user flow, not only schema

## Current State Summary

### Backend

- The current system uses one `partner_requests` table for both variants, distinguished by `prKind`.
- The same table stores both shared fields and Anchor-only fields:
  - shared lifecycle/content fields
  - `prKind`
  - `anchorEventId`
  - `batchId`
  - visibility fields
  - applied economy/policy fields
- Evidence:
  - `apps/backend/src/entities/partner-request.ts:160`
  - `apps/backend/src/entities/partner-request.ts:161`
  - `apps/backend/src/entities/partner-request.ts:164`
  - `apps/backend/src/entities/partner-request.ts:171`
  - `apps/backend/src/entities/partner-request.ts:173`
  - `apps/backend/src/entities/partner-request.ts:177`

- `Partner` is shared today because it has a strict FK to `partner_requests.id`.
- Evidence:
  - `apps/backend/src/entities/partner.ts:45`
  - `apps/backend/src/entities/partner.ts:48`
  - `apps/backend/drizzle/0000_steep_blue_marvel.sql:256`

- Community creation already behaves as a mostly isolated flow:
  - structured create resolves community policy
  - NL create resolves community policy
  - both create `DRAFT` in the generic table
- Evidence:
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts:49`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts:62`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts:44`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts:57`

- Anchor behavior is injected into generic PR flows rather than isolated behind an Anchor boundary.
- Evidence:
  - `joinPR` conditionally expands full Anchor PRs:
    - `apps/backend/src/domains/pr-core/use-cases/join-pr.ts:112`
  - alternative-batch recommendation/accept lives inside `pr-core` and branches on `prKind === "ANCHOR"`:
    - `apps/backend/src/domains/pr-core/use-cases/recommend-alternative-batches.ts:44`
    - `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts:50`
  - Anchor PR auto-expansion recreates rows by writing Anchor-only fields back into the generic table:
    - `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts:105`
    - `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts:106`
    - `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts:107`
    - `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts:111`

- The repository layer is also mixed:
  - generic CRUD and Anchor-only queries live in `PartnerRequestRepository`
- Evidence:
  - `apps/backend/src/repositories/PartnerRequestRepository.ts`

### Frontend

- Routing is still generic-first:
  - one detail page: `/pr/:id`
  - one create page: `/pr/new`
  - one economy page under generic PR detail
- Evidence:
  - `apps/frontend/src/router/index.ts:36`
  - `apps/frontend/src/router/index.ts:44`
  - `apps/frontend/src/router/index.ts:52`

- The current create flow is effectively Community-first:
  - analytics hardcode `prKind: "COMMUNITY"`
  - success navigation always returns to generic `/pr/:id`
- Evidence:
  - `apps/frontend/src/features/pr-create/usePRCreateFlow.ts:76`
  - `apps/frontend/src/features/pr-create/usePRCreateFlow.ts:80`

- `PRPage.vue` is a mixed detail page:
  - shared PR UI
  - Anchor-only economy entry
  - Anchor-only batch/event context
  - Anchor-only alternative-batch recommendations
- Evidence:
  - `apps/frontend/src/pages/PRPage.vue:72`
  - `apps/frontend/src/pages/PRPage.vue:316`
  - `apps/frontend/src/pages/PRPage.vue:317`
  - `apps/frontend/src/pages/PRPage.vue:319`

- Frontend detail typing is also mixed:
  - one `PRDetailView` carries both shared and Anchor/economy fields as optional properties
- Evidence:
  - `apps/frontend/src/entities/pr/types.ts:30`
  - `apps/frontend/src/entities/pr/types.ts:31`
  - `apps/frontend/src/entities/pr/types.ts:35`
  - `apps/frontend/src/entities/pr/types.ts:36`

- Anchor discovery is already a separate user flow:
  - Event Plaza page
  - Anchor Event page
  - Anchor Event detail reads batches and Anchor PRs
- Evidence:
  - `apps/frontend/src/pages/EventPlazaPage.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts:112`
  - `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts:115`

## Architectural Trade-off Identified in L0

### Option A: Two fully independent PR tables with no shared root row

Pros:

- strongest visual separation
- subtype tables are conceptually simple in isolation

Cons:

- breaks the current strict FK model for `Partner`
- forces a polymorphic reference such as `(prType, prId)` or a registry table
- weakens FK integrity unless an extra indirection layer is added
- is not minimal, because Partner, notifications, events, and generic lookups all need redesign

### Option B: Shared root PR table plus subtype tables

Pros:

- keeps `Partner.prId` stable
- keeps existing PR identity stable for routes, events, analytics, and share links
- allows true subtype separation without losing FK constraints
- is the smallest path from the current codebase

Cons:

- requires discipline to keep the root table truly shared-only
- introduces join-based loading for subtype data

## External Research Note

Relevant PostgreSQL guidance supports avoiding table inheritance as the main solution for this problem. PostgreSQL inheritance does not automatically integrate constraints and FK behavior the way an application-level shared-root model needs, so relying on inheritance here would not reduce the core complexity.

Source:

- PostgreSQL docs, Table Inheritance: https://www.postgresql.org/docs/current/ddl-inherit.html

Inference from source:

- A shared-root plus explicit subtype tables is a safer fit than PostgreSQL inheritance for preserving strong references from `Partner` and other dependent tables.

## L0 Recommendation

Proceed to L1 assuming this direction:

- keep `partner_requests` as the shared root identity table
- introduce `anchor_partner_requests` and `community_partner_requests`
- move Anchor-only fields out of the root first
- keep `Partner` referencing the shared root PR id
- split frontend pages by scenario:
  - `AnchorPRPage`
  - `CommunityPRPage`
  - separate create entry surfaces
- keep shared UI pieces shared, not duplicated:
  - hero/header
  - core PR card
  - action panel
  - share section
  - edit/status modals

## What Should Be Considered Shared at This Stage

These still look like cross-scenario core, unless L1 finds otherwise:

- PR identity
- lifecycle status
- time window
- location
- min/max partner bounds
- Partner slot mechanism
- creator ownership/auth
- share/cache basics

These already look subtype-specific:

- Anchor event linkage
- batch linkage
- visibility/auto-hide behavior
- applied economy policy fields
- alternative-batch recommendations
- batch expansion logic

## Risk Notes for Later Stages

- If too many fields remain in the root table, the split becomes nominal only.
- If the frontend keeps generic routes as the primary route model, page separation will be cosmetic only.
- If economy stays embedded inside Anchor PR tables forever, future domain extraction will be harder.
- If `Partner` is made polymorphic too early, the refactor will become larger than the minimal principle allows.

## Approval Gate for L1

L1 should be drafted only if the following direction is approved:

- use a shared root `partner_requests` identity table
- use subtype tables for Anchor PR and Community PR
- split pages/routes by scenario, while preserving shared UI building blocks

If this direction is not approved and you want two completely independent PR tables with no shared root, we should stop and revisit the maintainability/FK trade-off before L1.
