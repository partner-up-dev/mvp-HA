# Anchor Event Other Events Carousel

## Objective & Hypothesis
Reality: In Anchor Event Form Mode, the "看看其它活动" drawer shows event cards with horizontal overflow and the card carousel does not reliably switch cards.

Hypothesis: the drawer passes the current route event id as carousel model value while filtering that same event out of the item list, leaving `PeekRadioCarousel` without a selected item. Desktop / browser-agent dragging is also blocked because the carousel only treats touch and pen pointer events as swipe gestures.

## Guardrails Touched
- `/e/:eventId` Form Mode route-level state remains owned by `AnchorEventLandingPage.vue`.
- `PeekRadioCarousel.vue` remains the event-domain carousel primitive used by Form Mode location selection and Anchor Event selection surfaces.
- Selecting an other-event card still navigates to that event landing route.

## Verification
- Reproduced with agent-browser on `http://localhost:4001/e/1` in FORM mode before the fix.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- Re-tested with agent-browser: the drawer carousel now has one checked candidate, carousel root no longer reports horizontal scroll width beyond its client width, and mouse drag from first candidate routes to `/e/2`.
- Corrected event ownership: carousel selection changes now only update drawer-local selected card state; explicit card activation from the parent-injected `EventCard` triggers navigation.
- Re-tested with agent-browser after the correction: swipe in the other-events drawer changes checked card while staying on `/e/1`; clicking the selected injected card navigates to `/e/2`.
- Added explicit equal-height layout through `PeekRadioCarousel` option, `AnchorEventRadioCardCarousel` slot wrapper, and injected `EventCard`.
- Re-tested with agent-browser: `/events/search` card layout heights are all 264px before transform; Form Mode other-events drawer card layout heights are all 242px before transform. Visual rect heights still differ because the selected/peek scale transform remains part of carousel behavior.
- Fixed regression from putting equal-height flex behavior in generic `PeekRadioCarousel` options: Form Mode location cards use absolutely positioned internals and collapsed visually under flex item sizing. Equal-height behavior is now scoped to `AnchorEventRadioCardCarousel`; location selector cards are visible again on `/e/1`.
