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
- Frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth and bind paths.
- Admin and user sessions are separate client contexts.

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
- `/admin/booking-support`
- `/admin/booking-execution`
- `/admin/pois`

Important coordination note:

- user-managed Anchor PR creation is event-scoped: frontend starts it from `/events/:eventId`, backend realizes it through `POST /api/events/:eventId/batches/:batchId/anchor-prs`, and the system does not expose a generic standalone Anchor PR create route
- `/events/search` is an Anchor PR discovery route scoped by one active `Anchor Event` plus one or more local dates; its route state should be recoverable through query parameters such as `eventId` and repeated date values
- `GET /api/events` is the public active Anchor Event catalog contract and should return enough event object data for event-card selection surfaces; response ordering is backend-authoritative and may vary between requests for exposure balancing, so frontend should treat it as opaque display policy instead of hardcoded ranking truth; it does not own Anchor PR search results
- `GET /api/apr/search` is the Anchor PR search read contract; it queries by active `Anchor Event` id plus repeated local-date values and returns matching visible actionable Anchor PR candidates
- if Anchor PR search has exactly one result, frontend may replace-route to that `/apr/:id` while avoiding a browser-back auto-redirect loop
- `/events/:eventId` accepts optional query `mode=card|list` to bootstrap the initial frontend view mode; missing or invalid values fall back to `list`
- that `mode` query is a frontend route-state hint for initial rendering only in the current version; switching modes in-page does not rewrite the URL, and `spm` remains attribution-only rather than a UI-mode switch

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

## 9. Coordination And Failure Assumptions

- The primary coordination path is browser route -> frontend process/UI -> typed backend API -> backend persistence and side effects -> frontend cache/UI refresh.
- Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts; frontend may optimize UX but not invent new domain truth.
- Best-effort outbox and job processing may complete after the initiating API response, so frontend must not assume all downstream side effects have already happened unless the API contract says so.
- Unsupported browser capabilities and auth/config gaps surface through backend status/code plus frontend fallback UX rather than through separate frontend-owned policy logic.
