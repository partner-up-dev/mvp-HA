# Event Page Refactor Proposal

## 1. Context

Current pain points on `/events/:eventId` are clear:

- The page is list-first, so users must read many similar rows before making a choice.
- Joining requires entering a specific PR detail page first, which adds extra friction.
- Multiple Anchor PRs can represent effectively the same user-facing option (same visible location name + same time), causing information overload.
- Users feel "I don’t know where to start" because the decision unit (one PR) is too granular for first action.

This proposal reframes the primary decision unit from "PR" to "demand combination" and introduces a card-first interaction while keeping the existing list mode.

## 2. Proposal Summary

I agree with your direction. Recommended product decisions:

- Introduce Tinder-like swipe cards as a first-class browsing mode.
- Make cards represent a demand combination, not a single Anchor PR.
- Keep both Card mode and List mode; provide a switch in `PageHeader` top action slot.
- Show the same creation card capability when cards are exhausted.
- When a specific `spm` is detected (for printed QR continuity), default to Card mode.

## 3. Product Goals

- Reduce first-decision latency (time from page entry to first join/skip action).
- Remove detail-page dependency for joining common cases.
- Reduce cognitive load from duplicate/similar Anchor PR entries.
- Preserve control for advanced users through List mode.

## 4. Non-Goals

- Do not remove existing List mode.
- Do not change Anchor PR detail page semantics (`join/exit/confirm/check-in`).
- Do not redesign Event Plaza (`/events`) in this iteration.

## 5. Core Model: Demand Card

### 5.1 Definition

A card is a normalized user demand combination:

- `displayLocationName` (user-facing location label, e.g. `广外羽毛球馆`)
- `timeWindow` (same batch time window)
- `preferenceFingerprint` (optional grouped preference signal, such as `羽毛球养生局`)

Card and Anchor PR are many-to-many over time; in one batch, one card usually maps to multiple candidate PRs.

### 5.2 Grouping Key

Use a deterministic key for rendering and analytics:

`cardKey = eventId + batchId + displayLocationName + timeSlotKey + preferenceFingerprint`

### 5.3 Why this model

It matches user intent first ("I want this kind of game at this place/time") and hides operational-level duplication (court-level or PR-level fragmentation).

## 6. Joining Semantics (Critical)

### 6.1 Expected behavior

If user accepts a card, system should join **any** joinable Anchor PR that belongs to that card group.

### 6.2 Recommended ownership

Selection should be backend-owned, not frontend-owned, to avoid race conditions and duplicate logic.

Add a card-join use case (name can be finalized during implementation), for example:

- `POST /api/events/:eventId/batches/:batchId/demand-cards/:cardKey/join`

Response:

- success: returns joined PR id + canonical path
- no candidate: returns domain error (`NO_JOINABLE_CANDIDATE`) so frontend can move to next card or creation card

### 6.3 Candidate selection strategy

When multiple PRs satisfy one card:

1. filter joinable candidates (`OPEN/READY`, not locked, not full, valid time rules)
2. prefer highest occupancy ratio to reduce fragmentation
3. tie-break by earliest creation time for deterministic behavior

This directly improves fill efficiency and reduces long-tail empty PRs.

## 7. UI/UX Specification

### 7.1 Mode switch

- Add `Card | List` switch in `PageHeader` `top-actions` slot.
- Persist last chosen mode in local storage per route (`anchor-event-view-mode`).

### 7.2 Card mode

- Vertical stack with one active card.
- Gesture actions:
  - swipe right = accept and join
  - swipe left = skip
- Accessibility parity:
  - explicit buttons (`Skip`, `Join`) must be provided in addition to gestures.
- Card content should include:
  - location display name
  - time label
  - preference summary
  - lightweight social proof (`x candidates`, `y joined`)

### 7.3 List mode

- Keep current batch tabs + PR list + creation card flow.
- Can reuse existing `AnchorEventPRCard` and `AnchorPRCreateCard` components.

### 7.4 Exhaustion behavior

In Card mode, when all cards are consumed (joined or skipped for current session), show creation card block with the same behavior as list mode.

## 8. Location Normalization Requirement

The proposal depends on user-facing location normalization:

- Different physical sub-venues that are functionally equivalent must map to one display label.
- Example: multiple badminton courts map to `广外羽毛球馆` for display and card grouping.

Recommended data direction:

- keep internal location id for operational precision
- add display-level normalization mapping (e.g., location alias/group)
- expose normalized `displayLocationName` in event detail/card payload

## 9. SPM-based Default Mode

### 9.1 Rule

If current session has matching `spm` from printed QR campaign, default to Card mode.

Suggested precedence:

1. valid campaign `spm` match -> `Card`
2. user explicit stored preference -> stored mode
3. fallback -> `List`

### 9.2 Compatibility

Existing `sessionStorage` attribution capture already exists (`resolveCurrentSpmAttribution`), so this can be layered without changing current analytics persistence behavior.

## 10. Analytics

Add/extend events to compare mode performance:

- `anchor_event_mode_shown` (`mode`, `source`, `spm`)
- `anchor_event_mode_switch` (`from`, `to`)
- `anchor_event_card_impression` (`cardKey`, `batchId`)
- `anchor_event_card_accept` (`cardKey`, `selectedPrId`)
- `anchor_event_card_skip` (`cardKey`)
- `anchor_event_card_exhausted` (`batchId`)

Primary KPI deltas:

- join conversion rate from event page
- median time-to-first-join
- detail-page dependency rate before join
- PR fill concentration (fragmentation reduction)

## 11. Rollout Plan

### Phase 1: Frontend dual-mode shell

- Add mode switch and local preference persistence.
- Keep current list as stable fallback.

### Phase 2: Demand-card read model

- Build grouped card view model from event detail payload.
- Introduce card stack UI and accept/skip actions (button first, swipe second).

### Phase 3: Backend atomic join-by-card

- Add backend join-by-card use case and endpoint.
- Frontend accept action migrates from client-side PR selection to backend selection.

### Phase 4: SPM defaulting + analytics

- Add campaign `spm` matcher and mode default rule.
- Add event tracking and experiment dashboard slices.

### Phase 5: Stabilization

- Validate no regression for List mode.
- tune grouping and selection rules using observed data.

## 12. Trade-offs and Mitigations

- Trade-off: two modes increase UI complexity.
  - Mitigation: single shared data source + isolated presentation components.
- Trade-off: card abstraction hides PR-level transparency.
  - Mitigation: keep List mode one tap away; show brief candidate count/context on cards.
- Trade-off: wrong normalization can over-merge distinct options.
  - Mitigation: explicit location normalization config and auditable mapping.

## 13. Open Decisions

- Should skipped cards reset daily, per session, or manually via "reshuffle"?
- For accept failure due race, should we auto-retry within the same card group before surfacing failure?
- Do we allow an optional "peek details" action in card mode, or enforce pure quick-decision flow?

## 14. Recommendation

Proceed with this proposal. The direction is strategically correct and directly targets the overload root cause. The key engineering constraint is to make backend own card-to-PR join selection; otherwise maintainability and consistency will degrade quickly.
