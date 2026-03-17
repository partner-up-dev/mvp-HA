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
- Do not show batch tab bar in Card mode; cards rotate across all batches of the event.
- Show the same creation card capability when cards are exhausted.
- Default to List mode, with special `spm` override to Card mode.

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

A card is a normalized user demand combination in one batch:

- `batchId`
- `displayLocationName` (user-facing location label, e.g. `广外羽毛球馆`)
- `preferenceFingerprint` (optional grouped preference signal, such as `羽毛球养生局`)

`timeWindow` is inherited from `batchId`, so it is not part of the identity key.

### 5.2 Grouping Key

Use a deterministic key for rendering and analytics:

`cardKey = batchId + displayLocationName + preferenceFingerprint`

`eventId` and `timeSlotKey` are not included because route + `batchId` already lock the event and time window.

### 5.3 Why this model

It matches user intent first ("I want this kind of game at this place/time") and hides operational-level duplication.

## 6. Joining Semantics (Critical)

### 6.1 Expected behavior

If user accepts a card, system should join **any** joinable Anchor PR that belongs to that card group.

### 6.2 Backend ownership and concurrency

Selection should be backend-owned to avoid split frontend logic.

Important: backend ownership alone does not remove race conditions in serverless multi-instance deployment. Race safety must come from DB-level concurrency control (transaction, lock/constraint, idempotent retry), not from single-instance assumptions.

### 6.3 API shape

Recommended endpoint:

- `POST /api/events/:eventId/demand-cards/:cardKey/join`

Request body carries explicit demand fields so backend can validate and select a candidate PR:

- `batchId`
- `displayLocationName`
- `timeWindow`
- `preferenceFingerprint`

Response:

- success: returns joined PR id + canonical path
- no candidate: returns domain error (`NO_JOINABLE_CANDIDATE`) so frontend can move to next card or creation card

### 6.4 Candidate selection strategy

When multiple PRs satisfy one card:

1. filter joinable candidates (`OPEN/READY`, not locked, not full, valid time rules)
2. prefer highest occupancy ratio to reduce fragmentation
3. tie-break by earliest creation time for deterministic behavior

## 7. UI/UX Specification

### 7.1 Mode switch and default

- Add `Card | List` switch in `PageHeader` `top-actions` slot.
- Initial mode is always `List`.
- If current session has specific campaign `spm`, override initial mode to `Card`.

### 7.2 Card mode

- Do not render batch tab bar in Card mode.
- Card deck scope = all demand cards across all batches in the current event.
- Each card must show clear time context (batch time label) to avoid ambiguity.
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
  - location gallery hero image/banner (fallback to event cover)

### 7.2.1 Cross-batch rotation rule (explicit)

- Build one event-wide card queue from all batches.
- Sort cards by:
  1. batch start time ascending
  2. `cardKey` lexicographically ascending (stable tie-break)
- The active card is always the queue head.
- On `accept` or `skip`, remove the head and move to next head.
- On data refresh, rebuild with the same sort rule; cards already processed in current session remain filtered out.

### 7.3 List mode

- Keep current batch tabs + PR list + creation card flow.
- Reuse existing `AnchorEventPRCard` and `AnchorPRCreateCard` components.

### 7.4 Exhaustion behavior

In Card mode, when all cards across the event are consumed (joined or skipped), show creation card block with the same behavior as List mode.

## 8. Location and Media Data Requirements

- Location pool/resource should expose already user-facing location labels; no sub-venue-level listing is needed for this feature.
- Each location should provide gallery images; Card mode uses them as hero/banner visuals.

## 9. SPM-based Default Mode

### 9.1 Rule

Suggested precedence:

1. session `spm` matches `CARD_MODE_SPM_ALLOWLIST` -> initial `Card`
2. otherwise -> initial `List`

### 9.2 Compatibility

Existing `sessionStorage` attribution capture (`resolveCurrentSpmAttribution`) can be reused directly.

## 10. Analytics

Add/extend events to compare mode performance:

- `anchor_event_mode_shown` (`mode`, `source`, `spm`)
- `anchor_event_mode_switch` (`from`, `to`)
- `anchor_event_card_impression` (`cardKey`, `eventId`, `batchId`)
- `anchor_event_card_accept` (`cardKey`, `selectedPrId`)
- `anchor_event_card_skip` (`cardKey`)
- `anchor_event_card_exhausted` (`eventId`, `batchId`)

Primary KPI deltas:

- join conversion rate from event page
- median time-to-first-join
- detail-page dependency rate before join
- PR fill concentration (fragmentation reduction)

## 11. Rollout Plan

### Phase 1: Frontend dual-mode shell

- Add mode switch.
- Keep existing batch tab bar in List mode only.
- Keep current List mode as stable baseline.

### Phase 2: Demand-card read model and visuals

- Build grouped card view model from event detail payload.
- Implement deterministic event-wide cross-batch rotation (`batchStartAt asc`, then `cardKey asc`).
- Add card stack and accept/skip interactions.
- Add location gallery hero/banner rendering.

### Phase 3: Backend join-by-card endpoint

- Add `POST /api/events/:eventId/demand-cards/:cardKey/join`.
- Backend validates demand payload and selects one joinable PR atomically.
- Frontend accept action uses this endpoint only.

### Phase 4: SPM override + analytics

- Add `CARD_MODE_SPM_ALLOWLIST` matcher.
- Add mode/card analytics and funnel dashboard slices.

### Phase 5: Stabilization

- Validate no regression for List mode.
- Tune grouping and selection rules with real data.

## 12. Trade-offs and Mitigations

- Trade-off: two modes increase UI complexity.
  - Mitigation: shared data model with clearly separated mode behaviors.
- Trade-off: card abstraction hides PR-level transparency.
  - Mitigation: keep List mode one tap away and keep detail entry in card UI.
- Trade-off: join race remains possible under high concurrency.
  - Mitigation: DB-atomic selection + idempotent retry + explicit no-candidate fallback.

## 13. Open Decisions

- Should skipped cards reset daily, per session, or manually via "reshuffle"?
- For accept failure due race, should frontend auto-retry once before surfacing failure?
- Should Card mode include an explicit "peek PR detail" action before join?

## 14. Recommendation

Proceed with this proposal. The direction is strategically correct and directly targets overload. The implementation should keep event-wide cross-batch card rotation, List-first default behavior, and DB-atomic backend join selection.
