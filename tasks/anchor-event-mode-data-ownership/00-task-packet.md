# Task Packet - Anchor Event Mode Data Ownership

## Objective & Hypothesis

Move Anchor Event detail-page data ownership from `AnchorEventPage.vue` into the existing mode surfaces:

- `AnchorEventListModeSurface.vue` owns list-mode reads, list-mode derived state, list-mode create flow, and list exhausted state.
- `AnchorEventCardModeSurface.vue` owns card-mode reads, card stack state, card-mode create flow, card exhausted state, card drag hint, and card overflow guard.
- `AnchorEventPage.vue` remains the route shell for `eventId`, `viewMode`, mode switching, page frame, header/footer, and page-level prompts.

Hypothesis: using the existing mode surfaces as the ownership boundary is enough to achieve mode-scoped loading without adding new page components. Vue Query cache reuse will keep mode switching responsive while avoiding the card-only `demand-cards` request on list-mode entry.

## Guardrails Touched

- Frontend component ownership rules in `apps/frontend/src/AGENTS.components.md`.
- Event-domain UI boundaries under `apps/frontend/src/domains/event/ui/surfaces/`.
- Anchor Event detail route at `apps/frontend/src/pages/AnchorEventPage.vue`.
- Existing backend contracts:
  - `GET /api/events/:eventId`
  - `GET /api/events/:eventId/demand-cards`
  - `GET /api/pois/by-ids`
  - event-assisted PR creation mutation
- WeChat pending create replay behavior and cache invalidation semantics.
- Existing page frame, mode switch, header, footer, official-account prompt, and route behavior.

## Target State

- List mode entry requests only list-mode data:
  - `GET /api/events/:eventId`
  - `GET /api/pois/by-ids` only when list-mode visible PR locations produce POI ids
  - event-assisted create mutation only after user action or pending WeChat replay
- Card mode entry requests card-mode data:
  - `GET /api/events/:eventId`
  - `GET /api/events/:eventId/demand-cards`
  - `GET /api/pois/by-ids` only when card-mode demand cards produce POI ids
  - event-assisted create mutation only after user action or pending WeChat replay
- `AnchorEventPage.vue` no longer imports `useAnchorEventDetail`, `useAnchorEventDemandCards`, `usePoisByIds`, or `useCreateEventAssistedPR`.
- The existing surfaces keep their names and become stateful mode owners.
- Exhausted cards are implemented separately per mode and visually align with nearby mode cards:
  - list exhausted card aligns with list create-pr card, beta-group card, and related panel/card treatments
  - card exhausted card aligns with card empty/create area and beta-group card treatments
- Shared logic can move into domain composables only when it reduces duplication without hiding mode ownership.

## Execution Steps

1. Establish the new ownership boundary in `AnchorEventPage.vue`.
   - Keep `eventId`, `viewMode`, mode switching, page frame, header/footer, and official-account prompt.
   - Pass `eventId` and mode-switch contract into the active surface.

2. Move list-mode data and behavior into `AnchorEventListModeSurface.vue`.
   - Add `eventId` prop.
   - Move `useAnchorEventDetail`, list loading/error handling, date grouping, selected date state, list create options, list create handler, and list-mode POI gallery resolution.
   - Add list-mode exhausted card state and UI.

3. Move card-mode data and behavior into `AnchorEventCardModeSurface.vue`.
   - Add `eventId` prop.
   - Move `useAnchorEventDetail`, `useAnchorEventDemandCards`, card stack state, processed card keys, card create options, card create handler, card-mode POI gallery resolution, drag hint, overflow guard, and card action errors.
   - Add card-mode exhausted card state and UI.

4. Extract shared create-flow logic only if needed.
   - Candidate: `useEventAssistedPRCreateFlow`.
   - It may own event-assisted mutation, WeChat auth blocking handoff, pending create replay, success routing, and cache invalidation-facing error normalization.
   - Keep mode-specific error display state inside the owning surface.

5. Remove duplicated or obsolete state from `AnchorEventPage.vue`.
   - Delete page-owned detail, demand-card, POI, create, date-group, and card-stack computations after each surface owns its path.

6. Verify request behavior and user-visible flows.
   - Build/typecheck.
   - Browser-network check list entry and card entry.
   - Browser check mode switch in both directions.
   - Browser check list exhausted card, card exhausted card, create entry points, card skip/detail, and pending-create replay where locally reproducible.

## Verification

- `pnpm --filter @partner-up-dev/frontend build`
- `agent-browser` open `http://localhost:4001/events/1?mode=list`
  - page renders list mode
  - network requests do not include `/api/events/1/demand-cards`
- `agent-browser` open `http://localhost:4001/events/1?mode=card`
  - page renders card mode
  - network requests include `/api/events/1/demand-cards`
- `agent-browser` switch list -> card
  - card data loads on demand
- `agent-browser` switch card -> list
  - list data renders without card-only refetch requirements
- Visual checks for exhausted cards in list and card modes.

## Open Questions

- Whether `GET /api/events/:eventId` should later split into smaller mode-specific read models. This task keeps backend contracts unchanged.
- Whether pending WeChat create replay should remain active for both modes immediately after route entry, or only after the owning surface mounts. This task should preserve current user-visible replay behavior.

## Execute Outcome

- `AnchorEventPage.vue` now owns only route/event id parsing, view-mode selection, header context, card-stage shell class, footer, and official-account prompt.
- `AnchorEventListModeSurface.vue` now owns its detail query, date grouping, selected date state, POI gallery resolution, list create flow, and list exhausted card.
- `AnchorEventCardModeSurface.vue` now owns its detail query, demand-card query, card stack state, POI gallery resolution, card create flow, card drag hint, overflow guard, card errors, and card exhausted copy.
- `useAnchorEventDetail` now accepts an optional `enabled` flag so reused controlled surfaces can avoid duplicate detail reads.
- Shared time-window display helpers moved into `domains/event/model/time-window-view.ts`.
- Shared event-assisted create behavior moved into `domains/event/use-cases/useEventAssistedPRCreateFlow.ts`.

## Execute Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `git diff --check` on touched files passed.
- `agent-browser` list-mode network check for `http://localhost:4001/events/1?mode=list` showed `GET /api/events/1` and did not include `/api/events/1/demand-cards`.
- `agent-browser` card-mode network check for `http://localhost:4001/events/1?mode=card` included both `GET /api/events/1` and `GET /api/events/1/demand-cards`.
- The current local backend data returned `404 Anchor event not found` for event `1`, so visual verification of populated list/card states was limited to error-shell and request-shape confirmation.
