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
- Backend owns the persisted partner-bounds invariant: manual PR writes must reject `minPartners < 1`, missing `minPartners`, and present `maxPartners < 2`; system-generated create paths may default missing or invalid `minPartners` to `2` before persistence, while still rejecting present `maxPartners < 2`.
- Legacy invalid partner-bound data is repaired through forward-only data migrations before deploy; frontend and backend reads do not introduce separate normalization policy.
- If the status set or lock/join semantics change, backend runtime, frontend UX, and the PRD lifecycle description must move together.

## 3. Session Contract

- Frontend stores local user and admin access tokens in browser storage.
- Backend may rotate tokens through the `x-access-token` response header.
- Frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth, OAuth handoff, and bind paths.
- Admin and user sessions are separate client contexts.
- WeChat OAuth callback completion must not place the long-lived access token in route query parameters. Backend-owned OAuth callbacks hand the frontend session across with a short-lived signed cookie plus a non-secret handoff nonce.

## 4. Error Contract

- Backend command failures should converge on RFC 9457 `application/problem+json`.
- HTTP status selection should follow RFC 9110 semantics, especially across auth failures, forbidden actions, state conflicts, and invalid content.
- Backend owns stable machine-readable `code` values for domain guard failures and may also expose a stable `type` URI for the same problem family.
- Backend owns localized `title` and `detail` text for problem responses and selects them from request locale. Responses should set `Content-Language`.
- Frontend interprets HTTP status plus stable `code` to drive UX for auth-required flows, join failures, booking failures, and create-path fallbacks.
- For shared partner-bounds validation failures, backend and frontend should converge on one user-facing Chinese message rather than surfacing route-specific copies.
- Human-readable explanation remains backend-owned on command failures. Frontend owns placement and presentation.
- Problem-details transport shape is a cross-unit reusable substrate. Domain modules own their `type` and `code` registries.

## 5. Stable Route And Flow Contract

Stable user-facing route families that materially affect coordination include:

- `/`
- `/pr/new`
- `/pr/:id`
- `/pr/:id/messages`
- `/pr/:id/partners/:partnerId`
- `/pr/:id/booking-support`
- `/events`
- `/events/search`
- `/events/:eventId`
- `/e/:eventId`
- `/pr/mine`
- `/me`
- `/contact-support`
- `/contact-author`
- `/about`
- `/wechat/oauth/callback`
- `/admin/login`
- `/admin/pr`
- `/admin/pr-messages`
- `/admin/booking-support`
- `/admin/booking-execution`
- `/admin/pois`

Important coordination note:

- canonical PR routes converge on `/pr/*`; rollout may keep legacy scene-specific route families as temporary redirect bridges while shared links and clients converge
- canonical PR creation stays PR-owned and route-driven through `/pr/new`
- create commands are split by input mode:
  - `POST /api/pr/new/form`
  - `POST /api/pr/new/nl`
- create commands return the created PR id, resulting status, and canonical detail path so frontend can route without inferring publish outcome locally
- backend resolves create result state from the caller's auth context:
  - authenticated create persists and publishes in one command path
  - anonymous create persists `DRAFT` and returns that draft id for later authenticated publish
- Anchor Event assisted create prepares the same PR-owned structured payload and submits `POST /api/pr/new/form`
- event-assisted create carries transient create source or event referral through command context, while persisted PR state remains the same PR-owned field set used by structured create
- event-assisted create targets direct `OPEN` creation and therefore requires an authenticated account
- the old public batch-specific event-create route is retired from the public contract surface
- structured PR creation accepts arbitrary `type` input with event-type suggestions and accepts one resolved `time_window`; batch and free are UI modes rather than separate persisted PR models
- `/pr/:id` remains the primary PR detail route for read, join, exit, confirm, check-in, share, and booking-support handoff; it keeps the persistent notification-subscriptions section mounted there when reminder registration is relevant for that PR and links into adjacent PR sub-routes instead of absorbing all secondary actions inline
- `/events/search` is a PR discovery route scoped by one active `Anchor Event` plus one or more local dates; its route state should be recoverable through query parameters such as `eventId` and repeated date values
- `/e/:eventId` is the ad-scan-first Anchor Event landing entry; it may render `FORM` or `CARD_RICH` mode while `/events/:eventId` keeps the existing rich page responsibility
- `/e/:eventId` owns the Form Mode selection state and inline no-match recommendation result state in one route-level state machine.
- `GET /api/events` is the public active Anchor Event catalog contract and should return enough event object data for event-card selection surfaces; response ordering is backend-authoritative display policy, so frontend should treat it as opaque instead of hardcoded ranking truth; it does not own PR search results
- `GET /api/events` and `GET /api/events/:eventId` expose each Anchor Event's beta-group QR code when configured; `/about` and `/events/:eventId` use that event-owned value for beta-group entry instead of reading a generic beta-group public config key
- `GET /api/events/:eventId/landing-assignment` returns the backend-authored landing mode plus `assignmentRevision` for `/e/:eventId`
- `GET /api/events/:eventId/form-mode` is the Form Mode bootstrap contract; it returns the event snapshot, location gallery projection, available start options, each location's POI-availability-filtered start keys, published preset preference tags, and an optional backend-authored default selection from the nearest joinable PR under that event's time boundary.
- `POST /api/events/:eventId/form-mode/recommendation` accepts one selected location, one selected start time, and the current preference labels, then returns one matched recommendation plus an ordered candidate list
- `POST /api/events/:eventId/preference-tags/submissions` accepts visitor-authored label-only tags, records them as pending event-owned preference-tag moderation items, and does not automatically expose them to later visitors
- `GET /api/events/:eventId/demand-cards` is the backend-authored card-mode demand projection contract; it returns only joinable (`OPEN` / `READY`) demand-card groups for that event.
- the old public demand-card join route is retired from the public contract surface
- `GET /api/events/:eventId` exposes public event discovery through `timeWindows`. Discoverable PRs inside those time-window groups come from root PR reads keyed by `event.type + time_window`; create location options come from `event.locationPool` plus POI-owned per-time-window capacity and POI-owned availability rules.
- PR create, publish, and content-edit command boundaries validate that the full PR time window is accepted by the selected location's POI availability rules. Missing POI records and empty `availabilityRules` mean all-day availability.
- `GET /api/events/:eventId/demand-cards` groups demand through compatibility card keys, while the underlying candidate PR set should already come from root PR reads keyed by `event.type + time_window`.
- `GET /api/pr/search` is the PR search read contract; it queries by active `Anchor Event` id plus repeated local-date values and returns matching visible actionable PR candidates under that event's current activity type and time-pool rules
- if PR search has exactly one result, frontend may replace-route to `/pr/:id` while avoiding a browser-back auto-redirect loop
- `/events/:eventId` accepts optional query `mode=card|list` to bootstrap the initial frontend view mode; missing or invalid values fall back to `list`
- that `mode` query is a frontend route-state hint for initial rendering only in the current version; switching modes in-page does not rewrite the URL, and `spm` remains attribution-only rather than a UI-mode switch
- frontend stabilizes `/e/:eventId` landing mode through local storage keyed by `eventId + assignmentRevision`; timeout fallback enters `FORM`
- `/pr/:id` participant roster UI should use the existing `/pr/:id/partners/:partnerId` profile route for participant-badge navigation rather than introducing a second profile-route family
- `GET /api/pr/:id/actions/preflight` is the batch action-availability contract for PR detail UX. It evaluates one viewer against one PR and returns action entries such as `join`, `confirm`, `check_in`, and booking-contact actions through one stable minimal shape:
  - `evaluatedAt`
  - `actions[actionName].allowed`
  - `actions[actionName].problem.type`
  - `actions[actionName].problem.code`
  - `actions[actionName].problem.title`
  - `actions[actionName].problem.detail`
  - `actions[actionName].nextRelevantAt`
- preflight reads stay advisory. Backend command handlers remain authoritative and reuse the same decision logic plus the same stable `type` and `code` values when they reject a write.
- `OPTIONS /api/pr/:id/actions` may expose generic method capabilities and `HEAD /api/pr/:id/actions/preflight` may support metadata-aware infrastructure behavior. PR action availability semantics live on the `GET` response body.
- action-availability transport shape is a cross-unit reusable substrate. Each domain owns its action-name set, code registry, and fact loader.

## 6. Admin Booking Execution Contract

- Frontend admin workspace reads one workspace payload containing `pendingItems` and merged `auditItems`.
- Backend provides that workspace through `GET /api/admin/booking-execution/workspace`.
- `pendingItems` are derived from unresolved PRs that are in `READY` / `FULL` / `LOCKED_TO_START`, have reached minimum active participants, and still have platform-handled required booking resources; this contract does not depend on confirmed-participant count.
- Frontend submits one execution result per PR.
- Backend accepts that through `POST /api/admin/prs/:id/booking-execution`.
- The contract includes notification summary fields so admin UX can render fulfillment outcome without recomputing backend state.

## 7. Configuration And Metadata Contract

- Backend exposes public config values through `/api/config/public/:key`.
- Backend exposes build metadata through `/api/meta/build`.
- Frontend relies on those endpoints to avoid hardcoding operationally managed values.
- Event-specific beta-group QR codes are not public config values; they are Anchor Event fields and flow through the Anchor Event read and admin contracts.
- Event-owned landing rollout config is persisted through the infra `config` table while Anchor Event owns the namespace, payload schema, parse / serialize rules, and admin contract. Product-side rollout control is expressed through landing ratio override plus assignment revision; `CARD_RICH` ratio `0` means pure `FORM` rollout.
- Admin edits event-owned landing rollout config through `GET /api/admin/events/:eventId/landing-config` and `PUT /api/admin/events/:eventId/landing-config`.
- Event-owned preset preference tags and their moderation state are persisted through dedicated Anchor Event tables instead of config blobs; admin reads them through `GET /api/admin/events/:eventId/preference-tags`, replaces published tags through `PUT /api/admin/events/:eventId/preference-tags/published`, and moderates pending tags through `POST /api/admin/events/:eventId/preference-tags/:tagId/publish|reject`.

## 8. Share Descriptor Contract

- Entity-backed public detail routes such as `GET /api/pr/:id` provide canonical share metadata inside the detail payload.
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
- Frontend owns the route-scoped active share session and replay behavior, and it uses backend-provided canonical share metadata for entity truth.

## 9. PR Messaging Contract

- Backend owns persisted `PRMessage` items and one backend-authoritative `PRMessageInboxState` per `prId + userId`.
- `PRMessage` is a PR-scoped plain-text message item inside one `PartnerRequest` thread. A message is either participant-authored or operator-authored system context, and backend owns that author and type classification.
- `PRMessageInboxState` is the cross-unit marker state used to answer two separate questions without frontend-owned inference:
  - the viewer's read marker for that PR thread
  - whether the current unread message wave has already consumed one `PR_MESSAGE` notification opportunity for that recipient
- The frontend message rollout is PR-generic. The system should keep message entities, notification naming, and persistence semantics aligned with the single PR vocabulary.
- Frontend page placement is route-based: `/pr/:id` is the handoff and detail page, and `/pr/:id/messages` is the dedicated message page.
- Canonical route and API shape converge on the PR family:
  - `GET /api/pr/:id/messages`
  - `POST /api/pr/:id/messages`
  - `POST /api/pr/:id/messages/read-marker`
- `GET /api/pr/:id/messages` returns the visible message list plus thread-level viewer state needed for UI assembly and explicit read-marker advancement. That response should be sufficient for frontend to render:
  - ordered message items
  - whether each item is participant-authored or a system message
  - whether the current viewer can post
  - the latest visible message marker
  - the viewer's current read marker or an equivalent unread summary
- `POST /api/pr/:id/messages` accepts one plain-text message payload, rejects non-participants, persists the new message, and returns the created item plus refreshed thread viewer state.
- `POST /api/admin/prs/:id/messages` accepts one plain-text message payload from admin-authenticated tooling, persists one system message for that PR, and returns the created item plus refreshed thread state for downstream admin UX refresh.
- `POST /api/pr/:id/messages/read-marker` advances the viewer's read marker idempotently after the thread is actually shown. Read-marker advancement should be explicit rather than piggybacked on list fetch, so prefetching or hidden loads do not silently clear an unread wave.
- Message visibility and read-marker advancement reuse the same backend-owned eligibility rule: only current active participants may see or act on the thread. Participant-authored message creation uses that same rule, while admin-authored system-message creation is a separate admin-only capability.
- PR message notification semantics are governed by `notification-contracts.md`, including unread-wave eligibility, delayed summary dispatch, durable opportunity and wave records, and dispatch-time revalidation.
- Frontend owns only route and page placement, thread rendering, composer input, join-success subscription-modal prompting, and cache refresh behavior. It must not infer membership, unread-wave reset, or notification gating from stale local cache.

## 10. Coordination And Failure Assumptions

- The primary coordination path is browser route -> frontend process and UI -> typed backend API -> backend persistence and side effects -> frontend cache and UI refresh.
- Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts; frontend may optimize UX and does not invent new domain truth.
- Best-effort outbox and job processing may complete after the initiating API response, so frontend must not assume all downstream side effects have already happened unless the API contract says so.
- Unsupported browser capabilities and auth or config gaps surface through backend status and code plus frontend fallback UX rather than through separate frontend-owned policy logic.
