# Core Workflows

## 1. Create a PR from Home

1. The user lands on home and first understands the product through hero, value, or event-entry surfaces.
2. The user either expands the lightweight "start from one sentence" path or enters `/pr/new`.
3. The system interprets the natural-language intent, may map it to an existing Anchor Event context, and may synthesize a new `PR.type` when no existing event context fits.
4. The frontend submits the natural-language create command.
5. If the user already has an authenticated account, the backend creates and publishes the PR inside the same creation flow.
6. If the user is anonymous, the backend creates a `DRAFT` and waits for a later authenticated publish step.
7. The publish step assigns creator ownership and returns a shareable, revisitable `PR`.

## 2. Create a PR Through Structured Form

1. The user enters `/pr/new` and chooses the structured form path.
2. The `type` field accepts arbitrary input and may offer suggestion options from known event types.
3. The `time_window` field uses batch or free UI mode. Batch mode offers suggested windows from known event-side availability. Free mode allows direct manual time entry.
4. The UI resolves those inputs into one PR-owned create payload with one concrete `type` and one concrete `time_window`.
5. The frontend submits the structured create command.
6. If the user already has an authenticated account, the backend creates and publishes the PR inside the same creation flow.
7. If the user is anonymous, the backend creates a `DRAFT` and waits for a later authenticated publish step.
8. The publish step assigns creator ownership and returns a shareable, revisitable `PR`.

## 3. Enter Through a Link and Join a PR

1. The user opens `/pr/:id`.
2. The user reads the request details, current count, visible status, and participant list. In the current event-context detail layout, notification subscriptions remain as a persistent section, the participant roster opens from the facts-card participant row, and venue images use the same clickable label-row entry pattern.
3. Joining uses local account plus PIN by default; actions that require stronger identity guarantees use authenticated session plus WeChat binding.
4. Before join, the system checks time-window conflict, state, capacity, and context-specific rules.
5. If join succeeds in a PR where reminder registration is relevant, the system immediately prompts the notification-subscription modal while still keeping the persistent notification-subscriptions section available on the detail page for later revisit.
6. If join succeeds, the user enters the downstream progression of that collaboration object.
7. If the current PR was entered from Anchor Event context and is not the right fit, `/pr/:id` keeps a lightweight path back to browsing other active Anchor Events without hiding the current collaboration detail.

## 4. Enter PR Through Anchor Event Browsing And Search

1. The user browses `/events`, `/events/:eventId`, or enters `/events/search`; event-card order on these entry surfaces is backend-authored display policy rather than frontend-owned ranking truth.
2. In `/events/search`, the user chooses one active `Anchor Event` and one or more available local dates before seeing matching `PR` results.
3. Search results follow the chosen Anchor Event's activity type and time-pool rules; result cards identify candidate PRs by time, location, visible status, and participant count rather than repeating event-side context.
4. If the search has exactly one result, the system may route directly to `/pr/:id`; otherwise, the user chooses one result from the list.
5. The user enters an existing `PR` from event card or search-result context. `/events/:eventId` may accept `mode=card|list` as the initial rendering hint. In card mode, the active demand card itself is also a detail-entry affordance, so tapping it should resolve to the same detail intent as the rightward action. In list mode, top-level tabs aggregate by local date while still preserving time-window grouping and location context inside the selected date panel; list rows should hide `EXPIRED` PRs while still allowing completed `CLOSED` rows to remain visible. Card-mode drag feedback should reveal directional skip versus detail cues in exposed stage space instead of covering the card body with opaque action stamps.
6. The Anchor Event page exposes that event's beta-group entry as an independent card. List mode defaults the card to a collapsed kicker and description; card mode defaults it to an expanded state with the QR code. The group is for event-specific support such as requesting new sessions, getting booking/subsidy support, and coordinating activity context.
7. If the current local date, time-pool rule, or location does not have a suitable PR and creation is still allowed, the user can create one through the controlled event-page flow.
8. The event page resolves its assisted-create choices into the same structured PR create payload shape used by `/pr/new` and may carry transient event referral context for route continuity.
9. The event page submits the same structured create command used by the form path. If the user already has an authenticated account, the backend creates and publishes the PR inside that same command.
10. The current Anchor Event and downstream PR detail surfaces may also expose other active Anchor Events as a secondary browsing path, so the user can pivot without leaving the event-context collaboration journey entirely.
11. The user may then join, continue browsing other visible PRs in that event context, or view booking-support information.
12. The resulting PR may continue through timing and reliability loops such as confirmation, reminders, and attendance follow-up when the corresponding modules are active.

## 5. Revisit and History Entry

1. When the user returns, the system restores existing session continuity when possible.
2. The user can inspect profile, binding, notifications, and local credentials through `/me`.
3. The user can revisit created and joined history through `/pr/mine`.

## 6. Share and Distribution

1. The user triggers sharing from a PR page or support-related page.
2. The system provides the available share method for that scenario, such as public link, WeChat share, or Xiaohongshu output.
3. Share links may carry `spm` attribution.
4. New visitors re-enter the corresponding route and continue the collaboration path.

## 7. Non-Realtime PR Messaging

1. A current active participant enters a `PR` detail page, reviews the current collaboration context, and uses that page as the handoff point into the dedicated message route `/pr/:id/messages`.
2. The message experience is a separate page so the detail page can stay focused on facts, participation, booking-support context, and notification-subscription management.
3. A current active participant can post plain-text messages inside the PR to coordinate meetup details, timing changes, or other collaboration context.
4. An operator may also add a plain-text system message to one specific `PR` when participants need an official coordination note, fulfillment update, or other operator-authored context inside the same thread.
5. The system persists both participant messages and operator-authored system messages inside the corresponding `PartnerRequest` context rather than forcing participants into an external chat tool.
6. If other current active participants still have remaining notification quota, the system opens one unread wave per `PR / recipient`, schedules one delayed summary notification opportunity after a short fixed debounce window, and still limits delivery to at most one send per unread wave.
7. After another participant revisits that PR and catches up on the unread wave, a later wave may trigger a new notification.

## 8. Reliability Loop

1. The user joins a `PR` whose `Partner` submodule carries explicit reliability-related facts such as confirmation or join-lock settings.
2. The relevant command path enforces whether immediate confirmation is required, whether additional joining is still allowed, and whether unconfirmed slots are released.
3. If the user still has relevant notification quota, the responsible modules may register reminder, new-partner, or booking-result notifications.
4. After the event, the attendance module may collect check-in feedback and contribute to the reliability loop.

## 9. Admin Booking Execution

1. When a `PR` is in `READY`, `FULL`, or `LOCKED_TO_START`, has reached minimum active participants, and still requires platform-handled booking resources (`PLATFORM` or `PLATFORM_PASSTHROUGH`), the system admits it into the operator pending workspace.
2. The operator reviews the target PR and executable resources. If the resource uses `PLATFORM_PASSTHROUGH`, the operator also reviews the current booking-contact phone number.
3. The operator submits a success or failure result, and failure requires a reason.
4. If the current booking-contact phone number is invalid under `PLATFORM_PASSTHROUGH`, the operator can release that contact so a new owner can take over the flow.
5. The system records auditable execution results and notifies current active participants when the conditions are met.

## 10. Support, Feedback, and Operator Support

1. The user enters `/contact-support` from home or footer-level support entrypoints.
2. The user is routed toward support, author feedback, or event-specific beta-group selection based on need. When `/contact-support` is opened inside a WeChat mini program webview, reimbursement-staff and platform-support entrypoints use QR presentation instead of outbound links.
3. The user can also reach `/about` from that path, inspect product and repository metadata, choose which active activity beta group to join, and open the official-account QR modal.
4. Operator pages maintain event, POI, booking-support, and related capabilities so the above workflows remain operable.
