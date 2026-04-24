# Task Packet - Admin PR Management Refactor

## MVT Core

- Objective & Hypothesis: Split admin ownership into one `Anchor Event` management surface and one global `PR` management surface. Hypothesis: a dedicated global `PR` management module will align admin tools with the single-`PR` domain model, while a slimmer `Anchor Event` management module will better reflect event-owned responsibilities such as event info, location pools, time-pool strategy, and time-window preview.
- Guardrails Touched:
  - admin route structure and navigation
  - admin backend controller and workspace contracts
  - frontend admin page composition and query ownership
  - event-owned versus PR-owned boundary clarity
  - event-level default participation policy ownership
- Verification:
  - backend typecheck and build pass
  - backend db:lint passes
  - frontend build passes
  - admin can edit event info, location pools, and time-pool strategy
  - admin can preview generated time windows without PR-editing controls in the event module
  - admin can search, create, and edit PRs from the dedicated PR management module

## Solidify Notes

- Input Type:
  - Constraint driven by the single-`PR` model and the revised Anchor Event page model
- Active Mode:
  - Solidify
- Durable Owner:
  - admin route and module contracts in Product TDD
  - backend admin controller and use-case shape
  - frontend admin pages and navigation

## Target Model

- admin splits into two surfaces:
  - `Anchor Event 管理`
  - `PR 管理`
- `Anchor Event 管理` owns:
  - activity info
  - location pools
  - time-pool strategy
  - generated time-window preview
  - event-level default participation policy values
- Anchor Event page browsing organization remains outside this admin refactor and continues to be derived from PRs under the same `type`
- `PR 管理` owns:
  - global PR search
  - PR creation
  - PR editing
- `PR 管理` search dimensions should include:
  - `type`
  - `timeWindow`
  - `location`
  - likely `status`
- `PR.type` input should be:
  - arbitrary text input
  - selector suggestions sourced from known `AnchorEvent.type`

## Confirmed Decisions

- Event-level default participation policy fields are:
  - `confirmationStartOffsetMinutes`
  - `confirmationEndOffsetMinutes`
  - `joinLockOffsetMinutes`
- `PR 管理` is global and is not organized by selecting an `Anchor Event` first.
- `PR 管理` search is organized around PR facts:
  - `type`
  - `timeWindow`
  - `location`
  - `status`
- `PR.type` remains arbitrary text with selector-style suggestions from known `AnchorEvent.type`.

## Implemented Surface Changes

- `Anchor Event 管理`
  - route: `/admin/anchor-events`
  - page: `AdminAnchorEventPage`
  - panels:
    - activity info
    - location pools
    - time-pool strategy
    - time-window preview
  - embedded PR management was removed
  - event-level default participation policy is editable in the activity info panel
- `PR 管理`
  - route: `/admin/pr`
  - page: `AdminPRPage`
  - supports:
    - global PR filtering
    - PR creation
    - PR content editing
    - PR status updates
    - PR visibility updates
  - `type` input is `input + datalist`
  - matching `AnchorEvent.type` suggestions prefill:
    - default min/max partners
    - default participation policy values
- `PR 系统留言`
  - route remains `/admin/pr-messages`
  - continues to work from anchor-event workspace context for now

## Backend Reality

- Controller split:
  - `GET /api/admin/anchor-events/workspace`
  - `POST /api/admin/anchor-events`
  - `PATCH /api/admin/anchor-events/:eventId`
  - `GET /api/admin/pr/workspace`
  - `POST /api/admin/prs`
  - `PATCH /api/admin/prs/:id/content`
  - `PATCH /api/admin/prs/:id/status`
  - `PATCH /api/admin/prs/:id/visibility`
  - `POST /api/admin/prs/:id/messages`
  - `POST /api/admin/prs/:id/partners/:partnerId/release`
- New admin PR workspace use-case:
  - `getAdminPRWorkspace`
- Anchor Event entity now owns default participation policy columns:
  - `defaultConfirmationStartOffsetMinutes`
  - `defaultConfirmationEndOffsetMinutes`
  - `defaultJoinLockOffsetMinutes`
- PR admin creation/editing is global and no longer depends on selecting an `Anchor Event` or validating event-owned time-window ownership.

## Frontend Reality

- New admin query modules:
  - `useAdminAnchorEvents`
  - `useAdminPRManagement`
- Compatibility query barrel:
  - `useAdminAnchorManagement`
- Navigation now exposes both:
  - `活动管理`
  - `PR 管理`
- `AdminPRPage` filters on:
  - `type`
  - `location`
  - `status`
  - `startAt`
  - `endAt`
- `AdminPRPage` edit form controls:
  - title
  - type
  - time window
  - location
  - min/max partners
  - participation policy
  - preferences
  - notes
  - status
  - visibility

## Migration

- Added schema migration:
  - `apps/backend/drizzle/0028_admin_anchor_event_participation_defaults.sql`
- Migration adds and backfills event-level default participation policy columns.
