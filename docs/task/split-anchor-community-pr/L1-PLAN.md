# L1 Plan: High-Level Strategy for Splitting Anchor PR and Community PR

## Stage Goal

Define the target architecture and migration strategy for Option B:

- one shared root PR identity
- separate Anchor PR and Community PR subtype tables
- separate scenario pages
- shared Partner mechanism and shared reusable UI

This stage locks the architectural direction, ownership boundaries, and rollout shape.
Field-by-field schema design and interface details are deferred to L2.

## Strategic Outcome

After this refactor, the system should behave as three coordinated layers instead of one overloaded PR model:

1. shared PR core
2. Anchor PR subtype
3. Community PR subtype

The goal is not just “more tables.”
The goal is to separate business logic and user flow without breaking shared participation, link stability, analytics continuity, or FK integrity.

## Target High-Level Architecture

### 1. Shared Root Aggregate

Keep `partner_requests` as the root identity aggregate.

Responsibilities:

- stable PR identity (`id`)
- shared lifecycle status
- shared join/exit behavior
- shared time/location/capacity semantics
- shared creator ownership/auth
- shared share/cache basics
- shared outbox/event/analytics aggregate id
- shared relation target for `Partner`

This root remains the only participation target:

- `partners.prId -> partner_requests.id`

This is the critical constraint that keeps the refactor minimal and preserves strong FK behavior.

### 2. Anchor PR Subtype

Add an `anchor_partner_requests` table keyed by `prId`.

This subtype owns Anchor-only concerns:

- anchor event linkage
- batch linkage
- visibility and auto-hide behavior
- applied economy/resource-booking snapshot fields
- alternative-batch recommendation context
- Anchor expansion/derivation logic

High-level domain ownership:

- new domain: `domains/pr-anchor`
- `domains/anchor-event` stays focused on Anchor Event discovery/lifecycle
- Anchor PR behavior that currently depends on `prKind === "ANCHOR"` moves out of `pr-core`

### 3. Community PR Subtype

Add a `community_partner_requests` table keyed by `prId`.

This subtype starts thin on purpose.

Its value is structural first:

- creates an explicit Community boundary
- stops Community flows from living under generic PR modules
- gives future Community-only fields a real home
- avoids re-entangling Community logic with Anchor logic later

High-level domain ownership:

- new domain: `domains/pr-community`
- Community-specific creation, publishing, editing, and Community detail/read models move here

## Domain Boundary Strategy

### `domains/pr-core`

Keep only cross-scenario capabilities here:

- root PR lookup/resolution
- temporal refresh
- shared status rules
- slot management
- join / exit
- shared share/read helpers that are truly scenario-neutral

### `domains/pr-anchor`

Move Anchor-specific behavior here:

- Anchor PR detail assembly
- Anchor PR page read model
- Anchor-only partner actions:
  - confirm
  - check-in
- same-batch and alternative-batch recommendations
- accept-alternative-batch flow
- full-Anchor expansion flow
- Anchor policy snapshot loading

### `domains/pr-community`

Move Community-specific behavior here:

- natural-language create
- structured create
- draft publish
- Community content update
- Community status update
- Community detail assembly

Rationale:

- these flows are already effectively Community-first
- keeping them in `pr-core` would preserve the semantic confusion the refactor is trying to remove

## Persistence Strategy

### Root Table

`partner_requests` becomes shared-only over time.

It should retain only data that is required by:

- shared lifecycle logic
- Partner/slot logic
- cross-scenario link identity
- shared read surfaces

### Subtype Tables

`anchor_partner_requests`

- holds Anchor-only fields first
- becomes the required join target for Anchor detail/read logic

`community_partner_requests`

- may start as a structural subtype row with a minimal payload
- receives Community-only fields as soon as they are identified in L2

### Important Constraint

Do not make `Partner`, notifications, or domain events polymorphic in this refactor.

That would turn a minimal split into a deeper infrastructure redesign.

## API Strategy

### Shared Endpoints That Stay on Root PR

Keep shared participation endpoints on the root PR id:

- join
- exit

Reason:

- these actions are driven by the shared Partner mechanism, not by scenario-specific content structure

### Anchor-Only Participation Endpoints

Move these to Anchor-owned surfaces:

- confirm
- check-in

Reason:

- Community PR no longer includes confirm/check-in in the target design
- these behaviors depend on Anchor-only attendance/confirmation semantics
- keeping them generic would preserve the current semantic leakage

### Scenario-Specific Endpoints

Introduce scenario-owned read/write surfaces:

- Community:
  - create
  - publish
  - update content
  - update status
  - detail read
- Anchor:
  - detail read
  - alternative-batch recommendation
  - alternative-batch accept
  - economy read surface

## Frontend Strategy

### Target Pages

Community pages:

- `CommunityPRCreatePage`
- `CommunityPRPage`

Anchor pages:

- `AnchorPRPage`
- `AnchorPREconomyPage`

Existing event discovery remains:

- `EventPlazaPage`
- `AnchorEventPage`

### Important User-Flow Assumption

This L1 assumes:

- Community PR keeps manual creation pages
- Anchor PR creation remains event-driven/system-derived in this refactor

So this refactor does **not** add a manual `AnchorPRCreatePage` unless you explicitly ask for it in the approval step.

Reason:

- current Anchor flow is discovery -> event -> batch -> Anchor PR
- inventing a manual Anchor creation flow now would expand the scope beyond the minimal principle

### Shared UI Reuse

Do not fork these by default:

- `PRHeroHeader`
- `PRCard`
- `PRActionsPanel`
- `PRShareSection`
- shared edit/status modals
- shared location gallery

Instead, introduce a shared detail shell/composable layer that both scenario pages can compose.

Also treat the frontend PR refactor itself as part of scope:

- reduce semantic mixing in component names
- separate page/container logic from presentational components
- separate data mapping/view-model code from SCSS and presentational markup
- avoid keeping large mixed files like the current `PRPage.vue` as the long-term pattern

### Route Strategy

Use short route namespaces for propagation-friendly links.

Add scenario routes:

- `/cpr/new`
- `/cpr/:id`
- `/apr/:id`
- `/apr/:id/economy`

Do not keep legacy `/pr/...` detail/create routes in the target design.

### Shared List/Navigation Behavior

`/pr/mine` can remain a shared list page, but navigation should branch by scenario:

- Community item -> Community PR page
- Anchor item -> Anchor PR page

## Read Model Strategy

The frontend and controller layer should stop consuming one broad optional-heavy PR detail shape as the primary design.

Introduce scenario-specific read models at the application boundary:

- `BasePRDetail`
- `CommunityPRDetail`
- `AnchorPRDetail`

High-level rule:

- scenario pages should narrow once near the boundary
- scenario-specific templates should not scatter `prKind` checks everywhere

## Migration Strategy

Roll out in vertical-safe steps:

### Phase 1. Boundary Split Without Schema Removal

- split repositories and domain loaders into root/anchor/community responsibilities
- keep reading current columns from `partner_requests`
- move code ownership first, schema second

### Phase 2. Add Anchor Subtype Table

- create `anchor_partner_requests`
- backfill existing Anchor rows
- switch Anchor reads/writes to root + Anchor subtype
- remove Anchor-only branching from generic PR pages/controllers where possible

### Phase 3. Add Community Subtype Table

- create `community_partner_requests`
- backfill Community rows
- switch Community create/publish/update/detail to root + Community subtype

### Phase 4. Frontend Route Split

- ship scenario pages
- update shared lists and links to navigate by scenario

### Phase 5. Root Table Simplification

- stop reading subtype fields from `partner_requests`
- remove obsolete mixed columns from the root schema only after all callers are migrated

## Future Extraction Seams

This refactor should deliberately prepare, but not fully implement, future domain extraction.

### Economy

Do not let random pages/controllers read economy snapshot fields directly from storage forever.

Instead, treat Anchor economy data as an application-level projection assembled by Anchor read services.

This lets future extraction move from:

- `anchor_partner_requests`

to something like:

- `pr_economy_policies`
- `pr_reimbursements`

without changing route ownership again.

### Resource Booking

Treat resource-booking deadlines/state as an Anchor capability behind service/repository boundaries, not as generic PR fields.

That keeps a future `resource-booking` domain viable.

## Non-Goals in This Refactor

- redesigning the Partner mechanism
- changing PR ids
- replacing Anchor Event discovery pages
- fully extracting economy into its own domain now
- introducing manual Anchor PR creation unless explicitly approved

## Dependency Considerations

- DB migration/backfill must preserve `partner_requests.id`
- analytics/event payloads should continue to carry stable `prId` and `prKind`
- canonical share links should be generated directly as `/cpr/...` or `/apr/...`

## Documents To Update After Implementation

At implementation/finalization stage, align at least:

- `docs/product/overview.md`
- `docs/product/glossary.md`
- `docs/product/features/find-partner.md`
- any feature docs impacted by new scenario-specific pages/routes

## Approval Gate for L2

L2 should proceed only if you approve all of the following:

- `partner_requests` stays as the shared root identity aggregate
- new scenario domains are introduced: `pr-anchor` and `pr-community`
- shared partner-action endpoints keep only `join/exit` root-PR-based
- `confirm/check-in` become Anchor-only actions
- scenario-specific read/write flows move to scenario-owned modules/pages
- short route namespaces are adopted: `/cpr/...` and `/apr/...`
- Anchor PR creation remains event-driven in this refactor, with no new manual Anchor create page

If you want manual Anchor PR creation included now, or if you want shared create/detail APIs to remain generic-first, that should be changed before L2.
