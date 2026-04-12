# Core Workflows

## 1. Create a Community PR from Home

1. The user lands on home and first understands the product through hero, value, or event-entry surfaces.
2. The user either expands the lightweight "start from one sentence" path or enters `/cpr/new`.
3. The system creates a `DRAFT` first and publishes during the creation flow.
4. During publish, the system assigns creator ownership and preserves local PIN continuity.
5. The result is a `Community PR` that can be shared and revisited.

## 2. Enter Through a Link and Join a PR

1. The user opens `/cpr/:id` or `/apr/:id`.
2. The user reads the request details, current count, visible status, and participant list.
3. `Community PR` uses local account plus PIN for joining; `Anchor PR` uses authenticated session plus WeChat binding.
4. Before join, the system checks time-window conflict, state, capacity, and scenario rules.
5. If join succeeds, the user enters the downstream progression of that collaboration object.

## 3. Enter Anchor Collaboration Through Event Browsing And Search

1. The user browses `/events`, `/events/:eventId`, or enters `/events/search`; event-card order on these entry surfaces is non-ranking and may vary between requests to keep exposure balanced.
2. In `/events/search`, the user chooses one active `Anchor Event` and one or more available local dates before seeing matching `Anchor PR` results.
3. Search results remain anchored to the chosen `Anchor Event`; result cards identify candidate `Anchor PRs` by time, location, visible status, and participant count rather than repeating the already-known event context.
4. If the search has exactly one result, the system may route directly to that `/apr/:id`; otherwise, the user chooses one result from the list.
5. The user enters an existing `Anchor PR` from batch, card, or search-result context. `/events/:eventId` may accept `mode=card|list` as the initial rendering hint.
6. If the current batch or location does not have a suitable `Anchor PR` and creation is still allowed, the user can create one through the controlled event-page flow.
7. The user may then join, inspect alternatives, or view booking-support information.
8. `Anchor PR` continues through timing and reliability loops such as confirmation, reminders, and check-in.

## 4. Revisit and History Entry

1. When the user returns, the system restores existing session continuity when possible.
2. The user can inspect profile, binding, notifications, and local credentials through `/me`.
3. The user can revisit created and joined history through `/pr/mine`.

## 5. Share and Distribution

1. The user triggers sharing from a PR page or support-related page.
2. The system provides the available share method for that scenario, such as public link, WeChat share, or Xiaohongshu output.
3. Share links may carry `spm` attribution.
4. New visitors re-enter the corresponding route and continue the collaboration path.

## 6. Non-Realtime PR Messaging

1. A current active participant enters a PR detail page and reviews the current collaboration context. In the current rollout, the frontend message entry is exposed on `/apr/:id`.
2. A current active participant can post plain-text messages inside the PR to coordinate meetup details, timing changes, or other collaboration context.
3. The system persists those messages inside the corresponding `PartnerRequest` context rather than forcing participants into an external chat tool.
4. If other current active participants still have remaining notification quota, the system triggers message notifications under the rule of at most one send per `PR / recipient / unread wave`.
5. After another participant revisits that PR and catches up on the unread wave, a later wave may trigger a new notification.

## 7. Anchor Reliability Loop

1. The user joins an `Anchor PR`.
2. The system decides whether immediate confirmation is required, whether additional joining is still allowed, and whether unconfirmed slots must be released.
3. If the user still has relevant notification quota, the system may schedule reminder, new-partner, or booking-result notifications.
4. After the event, the user may submit check-in feedback and contribute to the reliability loop.

## 8. Admin Booking Execution

1. When an `Anchor PR` is in `READY`, `FULL`, or `LOCKED_TO_START`, has reached minimum active participants, and still requires platform-handled booking resources (`PLATFORM` or `PLATFORM_PASSTHROUGH`), the system admits it into the operator pending workspace.
2. The operator reviews the target PR and executable resources. If the resource uses `PLATFORM_PASSTHROUGH`, the operator also reviews the current booking-contact phone number.
3. The operator submits a success or failure result, and failure requires a reason.
4. If the current booking-contact phone number is invalid under `PLATFORM_PASSTHROUGH`, the operator can release that contact so a new owner can take over the flow.
5. The system records auditable execution results and notifies current active participants when the conditions are met.

## 9. Support, Feedback, and Operator Support

1. The user enters `/contact-support` from home or footer-level support entrypoints.
2. The user is routed toward support, author feedback, or beta-group QR code based on need.
3. The user can also reach `/about` from that path, inspect product and repository metadata, and open the official-account QR modal.
4. Operator pages maintain event, POI, booking-support, and related capabilities so the above workflows remain operable.
