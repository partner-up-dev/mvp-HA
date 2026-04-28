# Event UI Local Rules

This folder owns event-domain UI surfaces, controls, composites, and primitives.

## Anchor Event Form Mode Topology

`/e/:eventId` owns the complete Form Mode journey. Keep selection data, recommendation data, long-press continuity, and create fallback in one route-level state machine.

```text
/e/:eventId
`-- FORM mode
    |-- Selection State
    |   |-- location / start time / preferences
    |   `-- long-press CTA:
    |       加入一场 {time} 在 {location} 的 {event.title}活动
    |
    |-- Submit Recommendation
    |   `-- backend returns matchedRecommendation + orderedCandidates
    |
    |-- Matched Exists
    |   `-- route handoff overlay previews the matched PR card, then aligns it into canonical /pr/:id
    |
    `-- No Match
        `-- Inline Recommendation Result State
            |-- Candidate List
            |   `-- AnchorEventPRCard with action slot
            `-- Create CTA: 都不合适，帮我找
```

Rules:

- `AnchorEventFormModeSurface.vue` owns selection state, recommendation result state, matched handoff, no-match result transition, create fallback, and flow telemetry.
- Form Mode controls own local interaction state and expose committed values through narrow `v-model` contracts.
- The no-match result is a Form Mode inline state within `/e/:eventId`.
- Matched PR handoff state is route-level process state under `processes/route-handoff` so the overlay can survive `/e/:eventId` to `/pr/:id` navigation.
- PageHeader back in the no-match result state should return to the Form Mode selection state.
- The selection state owns the `查看所有场次` action.
- The special long-press animation belongs to the Form Mode primary CTA only.

## Form Mode Recommendation Semantics

Backend recommendation uses a two-stage model.

```text
base PR pool
|-- matched eligibility -> matched pool -> score sort -> matchedRecommendation
`-- when matched pool is empty -> score sort base PR pool -> orderedCandidates
```

Rules:

- The base PR pool comes from this Anchor Event's visible PR contexts and joinable PR status.
- A matched recommendation requires exact location, start time within a 5-minute tolerance, and no same-category preference conflict.
- Score is used to choose the best matched PR when multiple matches exist.
- Ordered candidates are returned only when the matched pool is empty.
- Ordered candidates use the same score function over the whole base PR pool.

## Anchor Event PR Card Actions

`primitives/AnchorEventPRCard.vue` is the event-domain PR card primitive for Anchor Event browsing and Form Mode candidate lists.

Rules:

- Prefer enhancing `AnchorEventPRCard.vue` for PR rows that need event-domain card behavior.
- The card may expose an `actions` slot at the bottom.
- The `actions` slot layout should be a flex row with `gap: var(--sys-spacing-small)`.
- List Mode can omit the `actions` slot and keep its existing browse-card behavior.
- Form Mode no-match candidate cards should provide a full-width join action through the `actions` slot.
