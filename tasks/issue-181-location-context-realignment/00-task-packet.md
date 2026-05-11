# Issue 181 Location Context Realignment

## Objective & Hypothesis

Unify Anchor Event location semantics before implementing POI time availability.

Hypothesis:

- Anchor Event context is derived by `PartnerRequest.type === AnchorEvent.type`.
- Anchor Event retains its own assisted-create guardrails: submitted location must be in the event location pool, and submitted time window must belong to the event time pool.
- System/user location pool distinction and `locationSource` can be removed.
- Location capacity moves to POI so later POI availability and capacity guards have one owner.
- `anchor_event_pr_attachments` is retired because event referral is transient context, not durable PR identity.

## Guardrails Touched

- PR root remains the durable owner of `type`, `time`, `location`, status, visibility, and participation policy fields.
- Anchor Event owns event-page create/discovery context and available location/time options.
- POI owns location-specific capacity and later availability.
- No user-facing #169 availability behavior is implemented in this slice.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend exec tsx --test src/domains/anchor-event/services/time-window-pool.test.ts` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/backend db:lint` passed.

## Implementation Notes

- `anchor_events.location_pool` is the only event-owned location pool.
- `pois.per_time_window_cap` is the capacity source; null means uncapped.
- `AnchorEventPRContextRepository` maps PRs to anchor events by type.
- `createEventAssistedPR` still checks event type match, event location scope, and event time pool ownership.
- `anchor_event_pr_attachments` is dropped by migration `0032_anchor_event_location_context_realignment.sql`.
