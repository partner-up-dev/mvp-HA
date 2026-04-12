# Rules And Invariants

## 1. Product Object And Scenario Rules

- The core external collaboration object is `PartnerRequest`.
- `PartnerRequest` currently exists as `Community PR` and `Anchor PR`.
- `Community PR` and `Anchor PR` share base semantics such as participation, time windows, and partner thresholds, but their pages and rules may evolve separately.
- PR messaging semantics span both `Community PR` and `Anchor PR`, but the current frontend entry is exposed only in `Anchor PR`.

## 2. Creation And Publish Rules

- The `Community PR` user creation path is always draft-first, then publish.
- The current version does not expose a generic `Anchor PR` creation entrypoint outside Anchor Event, batch, and location context.
- User-created `Anchor PR` may only happen inside the controlled event-page creation path and remains constrained by batch, location, partner, and timing rules.
- Publishing a `Community PR` must bind the creator to a user identity and preserve later ownership checks through PIN.

## 3. Lifecycle And Participation Rules

- The visible `PartnerRequest` status set is `DRAFT`, `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, and `EXPIRED`.
- `LOCKED_TO_START` means the collaboration object has entered the pre-start lock window; joining is no longer allowed, but progression toward `ACTIVE` may still continue.
- `PartnerRequest` state is jointly shaped by partner thresholds, time windows, confirmation windows, and scenario-specific rules.
- `PartnerRequest.minPartners` must be an integer and `>= 2`. If `maxPartners` is present, it must satisfy `maxPartners >= minPartners`.
- Auto-created paths must fall back to `2` when a valid `minPartners` is unavailable. Manual input paths must reject empty value, `0`, `1`, and invalid bounds.
- If the user already joined a non-terminal PR whose time window conflicts with the target PR, the system must reject new join actions and any creation or publish action that would claim a slot.
- `Community PR` supports `join` and `exit` only.
- `Anchor PR` supports `join`, `exit`, confirmation, and check-in feedback.
- PR messages are visible only to current active participants; users who exit or are released must no longer see that PR's message thread.

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

`Anchor PR` may additionally pass through confirmation-window, reminder, new-partner, and check-in loops.

### Participation Lifecycle Semantics

1. A slot starts as joinable.
2. A user joins and becomes active.
3. In `Anchor PR`, the participant may enter confirmation semantics.
4. The participant may exit, be released, or complete check-in.
5. Once no longer active, the participant must not be treated as a current participant.

## 4. Identity And Authentication Rules

- Browsing does not require upfront login.
- `Community PR` join and exit depend on local account plus PIN.
- Key `Anchor PR` participation actions require an authenticated local session plus a bound WeChat `openid`.
- Identity should support collaboration instead of becoming the initial gate for every path.

### User Relationship Progression

1. anonymous browse
2. local account creation or recovery
3. authenticated session continuity
4. optional WeChat binding
5. participation in higher-trust `Anchor PR` flows when required

## 5. Reliability Rules

- `Anchor PR` has a confirmation window. Unconfirmed slots may be released inside that window, and late joining may be blocked.
- Check-in feedback is not mandatory by default; absence of check-in should remain "unknown" rather than auto-converted into "did not attend".
- PR messaging is a non-realtime coordination layer and must not introduce chat-room semantics such as presence, typing, or read receipts.
- Notification subscription is modeled by remaining send quota, not by a simple toggle.
- PR message notifications are limited to at most one send per `PR / recipient / unread wave`.
- Before a PR message notification is sent, the system must re-validate that the recipient is still a current active participant of that PR.
- Only `PLATFORM_PASSTHROUGH` booking requires the first booking-contact owner to provide a phone number. Standard `PLATFORM` booking must not add that requirement.
- The platform-handled booking pending workspace admits PRs that are in `READY`, `FULL`, or `LOCKED_TO_START` and still meet minimum active-participant count. It does not require participants to be `CONFIRMED`.
- When the booking deadline is reached, invalidation may depend on whether active participants still meet minimum viable count. Lack of confirmation alone must not auto-release the group or mark it unformed.
- Once `Anchor PR` enters the platform booking fulfillment stage, operator results must be auditable and notification results must target current active participants rather than only the booking-contact owner.
- Manual operator release of an invalid booking contact must be recorded in the same audit semantics as the ownership effect of that release.

## 6. Distribution And Revisit Rules

- PR pages must remain re-enterable through public links.
- Share links may carry `spm` attribution and continue through the current browser session.
- Home, event pages, personal center, and history list all support revisit and re-entry.

## 7. Profile And Support Rules

- Participant profile pages are read-only and do not own editing behavior.
- The "Need Help" path must keep support, author feedback, and about-page routing distinct.
- Build metadata shown in `/about` must be interpretable in the current runtime and must not depend on a local git checkout inside the browser environment.
- Operator-managed configuration counts as product behavior whenever it changes a user-visible path.
