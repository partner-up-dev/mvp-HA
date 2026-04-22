# Rules And Invariants

## 1. Product Object And Context Rules

- The core external collaboration object is `PartnerRequest`, surfaced product-side as `PR`.
- The durable product vocabulary uses one `PR` term across docs, routes, contracts, and UI.
- `PR` keeps shared semantics such as participation, time windows, partner thresholds, sharing, revisit, and messaging.
- `PR` may be entered from home and distribution paths or from Anchor Event context.
- PR messaging currently uses a dedicated `/pr/:id/messages` page rather than an inline detail-page composer.
- PR messaging may contain both participant-authored messages and operator-authored system messages; system messages are part of the same thread and remain visually identifiable as system-authored context.

## 2. Creation And Publish Rules

- The home-led user creation path is always draft-first, then publish.
- Structured creation uses one PR-owned form contract. Its `type` field accepts arbitrary input and may offer suggestion options from known event types.
- Structured creation uses one PR-owned `time_window` result. The UI may expose batch and free modes, while the persisted PR still owns one resolved time window.
- Event-context PR creation is one assisted mode inside the Anchor Event domain.
- PR existence does not depend on Anchor Event identity or time-pool selection.
- Natural-language creation may map the intent to an existing Anchor Event context or synthesize a new `PR.type`.
- User-created PR from Anchor Event context uses the controlled event-page flow and remains constrained by that event page's local rules.
- Publishing a home-led PR must bind the creator to a user identity and preserve later ownership checks through PIN.
- The Anchor Event page shows discoverable PRs under the same activity type and time-pool rules.

## 3. Lifecycle And Participation Rules

- The visible `PartnerRequest` status set is `DRAFT`, `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, and `EXPIRED`.
- `LOCKED_TO_START` means the collaboration object has entered the pre-start lock window; joining is no longer allowed, and progression toward `ACTIVE` may still continue.
- `PartnerRequest` state is jointly shaped by partner thresholds, time windows, confirmation windows, and context-specific rules.
- `PartnerRequest.minPartners` must be an integer and `>= 2`. If `maxPartners` is present, it must satisfy `maxPartners >= minPartners`.
- Auto-created paths must fall back to `2` when a valid `minPartners` is unavailable. Manual input paths must reject empty value, `0`, `1`, and invalid bounds.
- If the user already joined a non-terminal PR whose time window conflicts with the target PR, the system must reject new join actions and any creation or publish action that would claim a slot.
- `PR` supports `join` and `exit`.
- `Partner` submodule may carry explicit confirmation and join-lock settings. Attendance follow-up may appear when the relevant collaboration module is active.
- PR messages are visible only to current active participants; users who exit or are released must no longer see that PR's message thread.
- Only current active participants may view the thread or act on read markers and participant posting, while operators may inject system messages through admin tooling without becoming participants themselves.
- PR detail keeps notification-subscription management visible as a persistent section when reminder registration is relevant for that PR.
- The participant roster is opened from the facts-card participant row, and each participant badge remains a read-only navigation entry into that participant's profile page.

### Status Semantics

| Status | Meaning | Join Semantics |
| --- | --- | --- |
| `DRAFT` | unpublished draft held by the creator | not joinable |
| `OPEN` | published and not yet formed | joinable |
| `READY` | minimum viable group reached and waiting to start | joinable until blocked by other rules |
| `FULL` | maximum partner count reached | not joinable |
| `LOCKED_TO_START` | pre-start lock window | not joinable |
| `ACTIVE` | in progress | normally no longer accepts new joins |
| `CLOSED` | explicitly concluded | not joinable |
| `EXPIRED` | ended because the time window elapsed | not joinable |

`Partner` progression may additionally pass through confirmation-window, reminder, new-partner, and attendance follow-up loops when the corresponding modules are active.

### Participation Lifecycle Semantics

1. A slot starts as joinable.
2. A user joins and becomes active.
3. When the `Partner` submodule carries a confirmation window, the participant may enter confirmation semantics.
4. The participant may exit, be released, or complete check-in.
5. Once no longer active, the participant must not be treated as a current participant.

## 4. Identity And Authentication Rules

- Browsing does not require upfront login.
- PR join and exit support local account plus PIN.
- Actions that require stronger identity guarantees use an authenticated local session plus a bound WeChat `openid`.
- Identity should support collaboration instead of becoming the initial gate for every path.

### User Relationship Progression

1. anonymous browse
2. local account creation or recovery
3. authenticated session continuity
4. optional WeChat binding
5. participation in actions that require stronger identity guarantees

## 5. Reliability Rules

- Partner admission may have a confirmation window when its explicit configuration carries one. Unconfirmed slots may be released inside that window, and late joining may be blocked.
- Check-in feedback is not mandatory by default; absence of check-in should remain "unknown" rather than auto-converted into "did not attend".
- PR messaging is a non-realtime coordination layer and must not introduce chat-room semantics such as presence, typing, or read receipts.
- Notification subscription is modeled by remaining send quota, not by a simple toggle.
- Successful join in a PR that supports reminder registration should immediately offer the notification-subscription modal while still leaving a durable management path on the detail page.
- PR message notifications are limited to at most one send per `PR / recipient / unread wave`.
- The current `PR_MESSAGE` timing policy is one fixed short-debounce summary opportunity per unread wave.
- Before a PR message notification is sent, the system must re-validate that the recipient is still a current active participant of that PR.
- Availability of join, confirm, booking-contact handoff, and similar operations is enforced on backend write paths; frontend may use preflight reads to surface the same guardrails before the user acts.
- Notification cards and prompts are contributed by their owning modules, so confirmation, booking, and other features can add notification items without one central interpreter inside the card container.
- Only `PLATFORM_PASSTHROUGH` booking requires the first booking-contact owner to provide a phone number. Standard `PLATFORM` booking must keep that requirement absent.
- The platform-handled booking pending workspace admits PRs that are in `READY`, `FULL`, or `LOCKED_TO_START` and still meet minimum active-participant count. It does not require participants to be `CONFIRMED`.
- When the booking deadline is reached, invalidation may depend on whether active participants still meet minimum viable count. Lack of confirmation alone must not auto-release the group or mark it unformed.
- Once a PR enters the platform booking fulfillment stage, operator results must be auditable and notification results must target current active participants rather than only the booking-contact owner.
- Manual operator release of an invalid booking contact must be recorded in the same audit semantics as the ownership effect of that release.

## 6. Distribution And Revisit Rules

- PR pages must remain re-enterable through public links.
- Share links may carry `spm` attribution and continue through the current browser session.
- Home, event pages, personal center, and history list all support revisit and re-entry.

## 7. Profile And Support Rules

- Participant profile pages are read-only and do not own editing behavior.
- The "Need Help" path must keep support, author feedback, and about-page routing distinct.
- Event-specific beta groups are support and activity-coordination entrypoints. They may help users request new sessions, get booking/subsidy support, or coordinate activity context, and backend-owned PR messaging keeps participant visibility and participant rules authoritative.
- Build metadata shown in `/about` must be interpretable in the current runtime and must not depend on a local git checkout inside the browser environment.
- Operator-managed configuration counts as product behavior whenever it changes a user-visible path.
