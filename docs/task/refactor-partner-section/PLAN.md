# Implementation Plan: Refactor Partner Section

## Status

Drafted from review comments on commit `1d716c31343f3cbf0bc51da614a943d8cb16b572`.

When this plan conflicts with the current `PROPOSAL.md`, the reviewed comments win.

## Review-Incorporated Decisions

These points are now treated as implementation constraints:

- Community PR join must not require WeChat authentication.
- Community PR join should create or reuse a local user and issue PIN-based auth, similar to Community PR publish.
- Reminder handling is not part of Community PR for this refactor; keep reminder scope Anchor-only unless product docs later say otherwise.
- Anchor confirmation must use a configurable confirmation window:
  - `confirmation_start`
  - `confirmation_end`
- Confirmation should only become available close to start time, with default `confirmation_start = T-2h`.
- `confirmation_end` must be earlier than the booking deadline.
- Join lock must be configurable per Anchor PR from the admin panel.
- Default join lock should equal `confirmation_end`.
- Booking should be triggered automatically once all active partners have confirmed.
- Partners still unconfirmed at `confirmation_end` should be released.
- If confirmed partner count is still below `minPartners` after booking deadline, the Anchor PR should expire.
- Exit should be hidden after event start.
- The "server-derived stateful view model" idea should be generalized into a documented guideline, not kept only inside this task proposal.

## Why This Is Larger Than a UI Refactor

The reviewed direction changes three different layers:

1. Product rules
   - Community join/auth behavior changes.
   - Anchor confirmation and join timing rules change.
   - Reminder scope changes.

2. Domain model
   - Anchor PR needs explicit participation-policy fields instead of hard-coded timing rules.
   - Community and Anchor join paths can no longer share the same auth assumptions.

3. UI structure
   - The partner section still needs consolidation, but it must render server-owned policy state rather than recompute it ad hoc.

## Goals

- Implement one shared partner section for `/cpr/:id` and `/apr/:id`.
- Correct the participation model so it matches the reviewed rules.
- Move temporal and policy-heavy state derivation to the backend.
- Expose Anchor PR participation policy in admin UI.
- Keep frontend and backend builds passing.

## Non-Goals

- No waitlist system.
- No direct messaging/contact exchange in the partner section.
- No redesign of booking-support page itself.
- No compatibility layer for outdated partner-section assumptions if a hard cut is cleaner.

## Execution Strategy

## Phase 1: Freeze the Reviewed Product Rules in Docs

Update product documentation before implementation so code work has one target:

- `docs/product/overview.md`
- `docs/product/features/find-partner.md`
- relevant current-state notes in `apps/frontend/AGENTS.md`
- relevant current-state notes in `apps/backend/AGENTS.md`

Document these rule corrections explicitly:

- Community join uses local/PIN identity, not WeChat-gated identity.
- Anchor-only reminder scope.
- Anchor confirmation window semantics.
- Configurable Anchor join lock.
- Booking auto-trigger after all confirmed.
- Anchor expiry if confirmed count is below `minPartners` at booking deadline.

This phase should also add a general engineering guideline:

- UI that depends on temporal/domain policy should prefer server-derived view models over frontend rule recomputation.

Recommended home for the guideline:

- `apps/frontend/src/ARCHITECTURE.md`
- optionally echoed in `apps/backend/AGENTS.md` if we want both sides to share the rule

## Phase 2: Introduce Explicit Anchor Participation Policy

Add participation-policy fields to the Anchor PR subtype, not to generic Community PR state.

Recommended storage home:

- `apps/backend/src/entities/anchor-partner-request.ts`

Add fields for:

- `confirmationStartOffsetMinutes`
- `confirmationEndOffsetMinutes`
- `joinLockOffsetMinutes`

Recommended default values:

- confirmation start: `120`
- confirmation end: `30`
- join lock: same as confirmation end unless explicitly overridden

Implementation notes:

- add forward-only schema migration
- backfill existing Anchor PR rows with defaults
- extend repository types and admin workspace payloads

## Phase 3: Split Community and Anchor Join/Auth Behavior

The current shared `joinPR(id, openId)` use case is no longer the right abstraction.

Refactor to explicit scenario-owned entrypoints:

- `joinCommunityPR`
- `joinAnchorPR`

### Community join path

Backend changes:

- allow join without WeChat OAuth session
- reuse existing local-user generation / PIN issuance flow used by Community publish
- return auth payload on successful join when a local account is created or re-established

Frontend changes:

- stop gating Community join behind `requireWeChatActionAuth`
- apply returned auth payload to local session store
- show Community participation state in PIN/local-account terms, not WeChat-login terms

### Anchor join path

Backend changes:

- keep WeChat-authenticated join requirement
- keep slot binding to authenticated WeChat user

Frontend changes:

- keep WeChat gate for Anchor join / confirm / check-in

## Phase 4: Replace Hard-Coded Anchor Timing Rules With Policy-Driven Rules

Current hard-coded behavior:

- auto-confirm on join during `T-1h ~ T-30min`
- auto-release at `T-1h`
- join lock at `T-30min`

Replace it with policy-driven behavior derived from Anchor PR fields plus booking deadline:

- confirm is available only within `[confirmation_start, confirmation_end)`
- unconfirmed slots release at `confirmation_end`
- join is blocked at `join_lock`
- booking deadline remains a separate later constraint
- if all active partners confirm before booking deadline, booking triggers immediately
- if booking deadline passes and confirmed count `< minPartners`, expire the PR

Implementation work:

- replace hard-coded helpers in `time-window.service.ts`
- update temporal refresh flow in `temporal-refresh.ts`
- update confirm/join/exit use cases to consume policy-based guards
- update public/detail responses so the frontend receives policy-derived state and timestamps

## Phase 5: Enforce Post-Start Exit Behavior

The review says exit is hidden after event start.

Implement both UI and backend enforcement:

- frontend hides the exit action after start
- backend rejects Anchor exit after start, even if a stale UI still sends it

This prevents UI-only policy drift.

## Phase 6: Narrow Reminder Scope to Anchor PR

Current docs and pages treat reminder as shared across Community and Anchor.

Change that:

- remove Community reminder UI
- remove Community reminder language from docs
- keep Anchor reminder behavior only
- keep reminder scheduling/cancellation tied to Anchor participation lifecycle

If existing backend reminder endpoints remain global for now, the partner-section rendering must still expose reminders only on Anchor PR pages.

## Phase 7: Add Server-Derived Partner Section View Models

Do not let the new partner section recompute domain rules from raw fields.

Add a `partnerSection` block to PR detail responses.

### Community partner section should include

- capacity summary
- roster data
- viewer participation state
- join/exit availability
- local-auth/PIN join semantics

### Anchor partner section should include

- capacity summary
- roster data
- viewer participation state
- join/exit/confirm/check-in availability
- confirmation window timestamps
- join-lock timestamp
- booking deadline state
- full-state alternatives
- reminder state if applicable

This phase also needs roster enrichment beyond `core.partners: number[]`.

Minimum useful roster item:

- `partnerId`
- `displayName`
- `avatarUrl`
- `isCreator`
- `isSelf`
- active slot state

## Phase 8: Build the New Frontend Partner Section

Frontend structure target:

- one shared `PartnerSection` shell
- scenario-specific extensions inside that shell
- creator controls separated from participant controls

Recommended responsibilities:

- `PartnerSummary`
- `PartnerRoster`
- `ViewerParticipationCard`
- `AnchorParticipationTimeline`
- `AnchorFullFallbacks`

Also perform these page changes:

- move participant counts out of `PRFactsCard`
- remove participant actions from `SharedPRActionsBar`
- keep share and booking-support entry as sibling sections
- keep page files as route entrypoints, not rule owners

## Phase 9: Extend Admin Anchor Management

Expose Anchor participation policy in admin create/edit forms.

Backend:

- extend admin schemas and use cases
- include policy fields in workspace summary payload

Frontend admin page:

- add form fields for confirmation window start/end
- add form field for join lock
- default join lock to confirmation end for new PRs
- validate `confirmation_start > confirmation_end`
- validate `join_lock >= confirmation_end` only if product truly wants later join; otherwise default and recommended value should remain equal
- validate booking deadline is later than confirmation end

Important note:

The exact inequality between `join_lock` and `confirmation_end` should be encoded once in backend validation after we translate the wording precisely. The plan assumes `join_lock` defaults to `confirmation_end`, but still remains configurable.

## Phase 10: Verification

Required checks:

- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`

Targeted manual verification:

- Community join works without WeChat and applies local PIN auth
- Anchor join still requires WeChat
- Anchor confirm only appears within confirmation window
- unconfirmed Anchor partners release at confirmation end
- join lock honors configured value
- exit disappears after start and backend rejects stale exit requests
- all-confirmed flow triggers booking
- under-min confirmed count at booking deadline expires the PR
- Community page has no reminder UI
- Anchor page still shows reminder UI when appropriate
- admin can create and edit Anchor participation policy

## Acceptance Criteria

- The partner section becomes the single participation surface on both PR pages.
- Community and Anchor no longer share incorrect auth assumptions.
- Anchor timing rules are configurable per PR and no longer hard-coded to `T-1h/T-30min`.
- Reminder UI is no longer shown on Community PR.
- Temporal/policy-heavy UI state is delivered from the backend in a dedicated view model.
- Admin panel can manage Anchor participation policy.
- Product and architecture docs reflect the new rules.
- Frontend and backend builds pass.

## Risks

- Community join auth changes touch session issuance and may expose edge cases around anonymous/local account reuse.
- Anchor timing changes affect temporal refresh, booking side effects, and state transitions at once.
- Admin validation can become confusing if join lock, confirmation end, and booking deadline are not defined in one consistent order.

## Recommended Order of Implementation

1. Update product/architecture docs and freeze the rule model.
2. Add Anchor participation-policy schema and migration.
3. Refactor backend join/auth flows.
4. Refactor Anchor timing/refresh/booking rules.
5. Extend admin APIs and admin UI.
6. Add server-derived `partnerSection` view models.
7. Refactor frontend PR pages to use the new section.
8. Run builds and manual verification.
