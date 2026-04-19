# Cross-Unit Contracts

## 1. Typed HTTP Contract

- Backend exports `AppType` from `apps/backend/src/index.ts`.
- Frontend creates Hono RPC clients with `hc<AppType>()`.
- Backend also exports selected domain and entity types for frontend compile-time reuse.

Contract implication:

- route shape, payload shape, and many response shapes are shared by type rather than duplicated manually
- some contract-breaking API changes are intentionally compile-time visible to the frontend workspace

## 2. PR Lifecycle Contract

- Backend owns `PartnerRequestStatus` and legal state transitions.
- Frontend renders and branches on the shared visible status set: `DRAFT`, `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, `EXPIRED`.
- Backend owns the persisted partner-bounds invariant: manual PR writes must reject `minPartners < 2` or missing `minPartners`; system-generated create paths may default missing/invalid `minPartners` to `2` before persistence.
- Legacy invalid partner-bound data is repaired through forward-only data migrations before deploy; frontend and backend reads do not introduce separate normalization policy.
- If the status set or lock/join semantics change, backend runtime, frontend UX, and the PRD lifecycle description must move together.

## 3. Session Contract

- Frontend stores local user and admin access tokens in browser storage.
- Backend may rotate tokens through the `x-access-token` response header.
- Frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth, OAuth handoff, and bind paths.
- Admin and user sessions are separate client contexts.
- WeChat OAuth callback completion must not place the long-lived access token in route query parameters. Backend-owned OAuth callbacks hand the frontend session across with a short-lived signed cookie plus a non-secret handoff nonce.

## 4. Error Contract

- Backend global errors resolve to JSON with at least `{ error }` and optionally `{ code }`.
- Frontend interprets status plus optional `code` to drive UX for auth-required flows, join failures, booking failures, and create-path fallbacks.
- For shared partner-bounds validation failures, backend and frontend should converge on one user-facing Chinese message rather than surfacing route-specific copies.

## 5. Stable Route And Flow Contract

Stable user-facing route families that materially affect coordination include:

- `/`
- `/cpr/new`
- `/cpr/:id`
- `/cpr/:id/partners/:partnerId`
- `/apr/:id`
- `/apr/:id/messages`
- `/apr/:id/partners/:partnerId`
- `/apr/:id/booking-support`
- `/events`
- `/events/search`
- `/events/:eventId`
- `/pr/mine`
- `/me`
- `/contact-support`
- `/contact-author`
- `/about`
- `/wechat/oauth/callback`
- `/admin/login`
- `/admin/anchor-pr`
- `/admin/anchor-pr-messages`
- `/admin/booking-support`
- `/admin/booking-execution`
- `/admin/pois`

Important coordination note:

- user-managed Anchor PR creation is event-scoped: frontend starts it from `/events/:eventId`, backend realizes it through `POST /api/events/:eventId/batches/:batchId/anchor-prs`, and the system does not expose a generic standalone Anchor PR create route
- `/apr/:id` remains the primary Anchor PR detail route for read/join/exit/confirm/check-in/share/booking-support handoff, keeps the persistent notification-subscriptions section mounted there, and links into adjacent Anchor PR sub-routes instead of absorbing all secondary actions inline
- `/events/search` is an Anchor PR discovery route scoped by one active `Anchor Event` plus one or more local dates; its route state should be recoverable through query parameters such as `eventId` and repeated date values
- `GET /api/events` is the public active Anchor Event catalog contract and should return enough event object data for event-card selection surfaces; response ordering is backend-authoritative display policy, so frontend should treat it as opaque instead of hardcoded ranking truth; it does not own Anchor PR search results
- `GET /api/events` and `GET /api/events/:eventId` expose each Anchor Event's beta-group QR code when configured; `/about` and `/events/:eventId` use that event-owned value for beta-group entry instead of reading a generic beta-group public config key
- `GET /api/events/:eventId/demand-cards` is the backend-authored card-mode demand projection contract; it returns only joinable (`OPEN` / `READY`) demand-card groups for that event and must stay semantically aligned with `POST /api/events/:eventId/demand-cards/:cardKey/join`
- `GET /api/apr/search` is the Anchor PR search read contract; it queries by active `Anchor Event` id plus repeated local-date values and returns matching visible actionable Anchor PR candidates
- if Anchor PR search has exactly one result, frontend may replace-route to that `/apr/:id` while avoiding a browser-back auto-redirect loop
- `/events/:eventId` accepts optional query `mode=card|list` to bootstrap the initial frontend view mode; missing or invalid values fall back to `list`
- that `mode` query is a frontend route-state hint for initial rendering only in the current version; switching modes in-page does not rewrite the URL, and `spm` remains attribution-only rather than a UI-mode switch
- `/apr/:id` participant roster UI should use the existing `/apr/:id/partners/:partnerId` profile route for participant-badge navigation rather than introducing a second profile-route family

## 6. Admin Booking Execution Contract

- Frontend admin workspace reads one workspace payload containing `pendingItems` and merged `auditItems`.
- Backend provides that workspace through `GET /api/admin/booking-execution/workspace`.
- `pendingItems` are derived from unresolved Anchor PRs that are in `READY` / `FULL` / `LOCKED_TO_START`, have reached minimum active participants, and still have platform-handled required booking resources; this contract does not depend on confirmed-participant count.
- Frontend submits one execution result per Anchor PR.
- Backend accepts that through `POST /api/admin/anchor-prs/:id/booking-execution`.
- The contract includes notification summary fields so admin UX can render fulfillment outcome without recomputing backend state.

## 7. Configuration And Metadata Contract

- Backend exposes public config values through `/api/config/public/:key`.
- Backend exposes build metadata through `/api/meta/build`.
- Frontend relies on those endpoints to avoid hardcoding operationally managed values.
- Event-specific beta-group QR codes are not public config values; they are Anchor Event fields and flow through the Anchor Event read/admin contracts.

## 8. Share Descriptor Contract

- Entity-backed public detail routes such as `/api/cpr/:id` and `/api/apr/:id` provide canonical share metadata inside the detail payload.
- Canonical share metadata includes stable route-owned fields required for base share correctness:
  - title
  - description
  - canonical path
  - default image path
  - revision token
- Frontend treats that metadata as the source for base share descriptors rather than recomputing a separate share truth in page-local code.
- Rich descriptions, thumbnails, and posters remain optional enhancements; failure to produce them must not remove or invalidate the base share descriptor.
- WeChat share coordination distinguishes:
  - the signature URL used to initialize JS-SDK for the current route
  - the target URL that will actually be shared outward
- Frontend owns the route-scoped active share session and replay behavior, but it must do so using backend-provided canonical share metadata for entity truth.

## 9. PR Messaging Contract

- Backend owns persisted `PRMessage` items and one backend-authoritative `PRMessageInboxState` per `prId + userId`.
- `PRMessage` is a PR-scoped plain-text message item inside one `PartnerRequest` thread. A message is either participant-authored or operator-authored system context, and backend owns that author/type classification.
- `PRMessageInboxState` is the cross-unit marker state used to answer two separate questions without frontend-owned inference:
  - the viewer's read marker for that PR thread
  - whether the current unread message wave has already consumed one `PR_MESSAGE` notification opportunity for that recipient
- Frontend rollout is currently Anchor-only, but the contract is PR-generic. The system should not hardcode message entities, notification naming, or persistence semantics as Anchor-only truth.
- In the current Anchor rollout, frontend page placement is route-based: `/apr/:id` is the handoff/detail page and `/apr/:id/messages` is the dedicated message page.
- Route/API shape should follow the existing scene-specific route families instead of introducing a third generic user-facing family. The Anchor rollout therefore depends on:
  - `GET /api/apr/:id/messages`
  - `POST /api/apr/:id/messages`
  - `POST /api/apr/:id/messages/read-marker`
- If Community frontend rollout starts later, it should use the parallel `/api/cpr/:id/messages*` shape with the same payload and response semantics rather than inventing a separate message contract.
- `GET /api/apr/:id/messages` returns the visible message list plus thread-level viewer state needed for UI assembly and explicit read-marker advancement. That response should be sufficient for frontend to render:
  - ordered message items
  - whether each item is participant-authored or a system message
  - whether the current viewer can post
  - the latest visible message marker
  - the viewer's current read marker or an equivalent unread summary
- `POST /api/apr/:id/messages` accepts one plain-text message payload, rejects non-participants, persists the new message, and returns the created item plus refreshed thread viewer state.
- `POST /api/admin/anchor-prs/:id/messages` accepts one plain-text message payload from admin-authenticated tooling, persists one system message for that Anchor PR, and returns the created item plus refreshed thread state for downstream admin UX refresh.
- `POST /api/apr/:id/messages/read-marker` advances the viewer's read marker idempotently after the thread is actually shown. Read-marker advancement should be explicit rather than piggybacked on list fetch, so prefetching or hidden loads do not silently clear an unread wave.
- Message visibility and read-marker advancement reuse the same backend-owned eligibility rule: only current active participants may see or act on the thread. Participant-authored message creation uses that same rule, while admin-authored system-message creation is a separate admin-only capability.
- PR message notification semantics are governed by `notification-contracts.md`, including unread-wave eligibility, delayed summary dispatch, durable opportunity/wave records, and dispatch-time revalidation.
- Frontend owns only route/page placement, thread rendering, composer input, join-success subscription-modal prompting, and cache refresh behavior. It must not infer membership, unread-wave reset, or notification gating from stale local cache.

## 10. Coordination And Failure Assumptions

- The primary coordination path is browser route -> frontend process/UI -> typed backend API -> backend persistence and side effects -> frontend cache/UI refresh.
- Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts; frontend may optimize UX but not invent new domain truth.
- Best-effort outbox and job processing may complete after the initiating API response, so frontend must not assume all downstream side effects have already happened unless the API contract says so.
- Unsupported browser capabilities and auth/config gaps surface through backend status/code plus frontend fallback UX rather than through separate frontend-owned policy logic.
