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
    |       加入一场 {time} 在 {location} 的 {event.title} 活动
    |
    |-- Submit Recommendation
    |   `-- backend returns primaryRecommendation + orderedCandidates
    |
    |-- Primary Exists
    |   `-- long-press splash continues into canonical /pr/:id
    |
    `-- No Primary
        `-- Inline Recommendation Result State
            |-- Candidate List
            |   `-- AnchorEventPRCard with action slot
            `-- Create CTA: 都不合适，帮我找
```

Rules:

- `AnchorEventFormModeSurface.vue` owns selection state, recommendation result state, primary handoff, no-primary result transition, create fallback, and flow telemetry.
- Form Mode controls own local interaction state and expose committed values through narrow `v-model` contracts.
- The no-primary result is a Form Mode inline state within `/e/:eventId`.
- The selection state owns the `查看所有场次` action.
- The special long-press animation belongs to the Form Mode primary CTA only.

## Anchor Event PR Card Actions

`primitives/AnchorEventPRCard.vue` is the event-domain PR card primitive for Anchor Event browsing and Form Mode candidate lists.

Rules:

- Prefer enhancing `AnchorEventPRCard.vue` for PR rows that need event-domain card behavior.
- The card may expose an `actions` slot at the bottom.
- The `actions` slot layout should be a flex row with `gap: var(--sys-spacing-small)`.
- List Mode can omit the `actions` slot and keep its existing browse-card behavior.
- Form Mode no-primary candidate cards should provide a full-width join action through the `actions` slot.
