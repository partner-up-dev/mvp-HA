# Anchor Event card overflow diagnosis

## Objective & Hypothesis

Confirm whether Anchor Event Page card mode creates horizontal overflow on the right side, then identify the smallest maintainable fix candidate.

Initial hypothesis: the card mode full-bleed layout combines negative page margins with viewport-width projection layers, causing the layout viewport to exceed the visible viewport.

## Guardrails Touched

- Input route: Reality
- Mode: Diagnose
- Frontend local constraints: use existing page scaffold/layout conventions and tokenized SCSS
- Files under investigation:
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/domains/event/ui/sections/AnchorEventCardModeSection.vue`
  - `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`

## Verification

- Use `agent-browser` against the local Vite app.
- Measure `document.documentElement.scrollWidth`, `window.innerWidth`, and overflowing element bounding boxes.
- Compare desktop and mobile-width viewports.

### Evidence Captured

- Reproduction URL: `http://127.0.0.1:4001/events/2?mode=card`
- Mobile viewport `390x844`: `clientWidth=390`, `scrollWidth=791`, right overflow `401`.
- Desktop viewport `1280x900`: `clientWidth=1280`, `scrollWidth=1892`, right overflow `612`.
- Actual right scroll confirmed on desktop: `window.scrollX=612` after scrolling to the maximum X position.
- The largest right-side overflow came from `.card-stage__projection-spill`, `.card-stage__projection-bloom`, `.card-stage__projection-light`, and `.card-stage__projection-side--right` inside `.card-stage__projection-layer`.
- Screenshot artifacts:
  - `tasks/anchor-event-card-overflow/scrolled-right-desktop.png`
  - `tasks/anchor-event-card-overflow/contain-paint-desktop.png`

### Fix Probe

Browser-injected CSS, without editing source:

```scss
.card-stage__projection-layer {
  contain: paint;
}
```

Results:

- Mobile viewport `390x844`: root overflow changed from `401` to `0`.
- Desktop viewport `1280x900`: root overflow changed from `612` to `0`.
- After the probe, attempting to scroll right kept `window.scrollX=0`.

Initial fix candidate: add `contain: paint` to `.card-stage__projection-layer` in `AnchorEventCardModeSection.vue`.

Reasoning: it isolates the projection layer's paint overflow at its existing `100vw` border box, so the effect can still occupy the viewport while no longer contributing to root horizontal scroll. This is less destructive than clipping `.card-stage`, `.card-stage__inner`, `.card-mode`, or `.anchor-event-page--card-active`, which would clip drag/projection visuals to narrower page or card boxes.

Rejection: this candidate clips the edge-glow contribution at the projection-layer paint containment boundary. It removes root overflow but changes the intended glow behavior, so it should not be kept as the final source fix.

### Applied Fix Verification

Source change applied:

```scss
.card-stage__projection-layer {
  contain: paint;
}
```

Post-fix `agent-browser` verification against `http://127.0.0.1:4001/events/2?mode=card`:

- Mobile viewport `390x844`: `clientWidth=390`, `scrollWidth=390`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- Desktop viewport `1280x900`: `clientWidth=1280`, `scrollWidth=1280`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- Computed style on `.card-stage__projection-layer`: `contain: paint`.
- Screenshot artifact:
  - `tasks/anchor-event-card-overflow/fixed-desktop.png`

Build verification:

- `pnpm --filter @partner-up-dev/frontend build` passed.
- Vite emitted the existing large vendor chunk warning.

### Alternative Fix Probe

Browser-injected CSS, overriding the source candidate:

```scss
.card-stage__projection-layer {
  contain: none !important;
}
```

Desktop `1280x900` results:

- Baseline without containment: `clientWidth=1280`, `scrollWidth=1892`, overflow `612`, right-scroll attempt moved `window.scrollX=612`.
- `html, body { overflow-x: clip; }`: `clientWidth=1280`, `scrollWidth=1280`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- `#app { overflow-x: clip; }`: `clientWidth=1280`, `scrollWidth=1280`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- `body { overflow-x: clip; }` only: did not fix root overflow.
- `html { overflow-x: clip; }` only: did not fix root overflow.
- `contain: paint` plus `overflow-clip-margin: 50vw`: did not fix root overflow.
- `position: fixed` viewport projection layer: fixed root overflow, but changes the projection layer's coordinate system and is higher visual risk.

Mobile `390x844` results:

- Baseline without containment: `clientWidth=390`, `scrollWidth=791`, overflow `401`, right-scroll attempt moved `window.scrollX=401`.
- Route-scoped `html, body { overflow-x: clip; }`: `clientWidth=390`, `scrollWidth=390`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- `#app { overflow-x: clip; }`: `clientWidth=390`, `scrollWidth=390`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- `position: fixed` viewport projection layer: fixed root overflow, but changes the projection layer's coordinate system.

Preferred next candidate: route-scoped `html` + `body` overflow guard while card stage is active. It prevents horizontal page scrolling at the viewport scroll root, while leaving `.card-stage__projection-layer` and its descendants with `overflow: visible` and no paint containment.

### Final Fix Applied

Implemented a route-scoped overflow guard in `AnchorEventPage.vue`:

- When `isCardStageActive` is true, add `anchor-event-card-overflow-guard` to both `html` and `body`.
- When card stage becomes inactive or the page unmounts, remove the class from both roots.
- Scoped page CSS maps that class to `overflow-x: clip`.
- `.card-stage__projection-layer` remains `contain: none` and `overflow: visible`.

Final post-fix `agent-browser` verification against `http://127.0.0.1:4001/events/2?mode=card`:

- Mobile viewport `390x844`: `clientWidth=390`, `scrollWidth=390`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- Mobile card page roots: `htmlGuard=true`, `bodyGuard=true`, `htmlOverflowX=clip`, `bodyOverflowX=clip`.
- Mobile projection layer: `contain=none`, `overflow-x=visible`; right spill still extended to `rectRight=783.99`.
- Mobile list mode `http://127.0.0.1:4001/events/2?mode=list`: `htmlGuard=false`, `bodyGuard=false`.
- Desktop viewport `1280x900`: `clientWidth=1280`, `scrollWidth=1280`, overflow `0`, right-scroll attempt kept `window.scrollX=0`.
- Desktop projection layer: `contain=none`, `overflow-x=visible`; right spill still extended to `rectRight=1885.27`.
