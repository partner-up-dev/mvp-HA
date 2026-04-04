# L2 Plan (Stage 2 Detailed Design)

## Stage 2 Objective
- Make the Event Section feel like the first active step into the product, not just a homepage content block.
- Strengthen the impression that current Anchor activities are real, trustworthy, fixed-time/fixed-place, and ready for the next step.
- Improve scene-binding and the handoff from homepage event highlights into event detail / event plaza.

## Stage 2 Changes

### 1. Event Section Conversion Framing
- Add stronger “join-now” support copy inside the Event Section itself.
- Surface lightweight trust cues that explain why the event path is the easiest first use path.
- Use only real frontend-available event data; do not invent fake live metrics or new backend contracts.

### 2. Event Card Actionability
- Make each event card feel more like an entry into a real event line than a generic media card.
- Surface a more concrete location anchor when available.
- Add a clearer next-step affordance so users understand that tapping the card leads to selectable sessions / entry detail.

### 3. Event Plaza Handoff
- Upgrade the plaza entry from a small trailing link into a clearer continuation block.
- Keep it subordinate to the highlighted event rail, but make the “see more current supply” path more legible.

### 4. Verification
- Frontend build must pass.
- Manual read-through should confirm:
  - Event Section feels like the first product-use path.
  - Card copy feels more scene-bound and less generic.
  - Plaza entry reads as a continuation of the event path, not a detached nav link.

## Files Expected In Stage 2
- `apps/frontend/src/domains/event/ui/sections/landing/EventHighlightsSection.vue`
- `apps/frontend/src/domains/event/ui/sections/landing/EventPlazaEntry.vue`
- `apps/frontend/src/domains/event/ui/primitives/EventCard.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

## Explicitly Out Of Scope For Stage 2
- Hero copy rewrite or hero order changes.
- New backend fields or API contracts for event highlights.
- Bookmark-nudge timing redesign.
- Literal 3D / scrollytelling-heavy motion work.
