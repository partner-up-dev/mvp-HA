# Product Capabilities

## 1. Collaboration Creation

- create a `PR` from home exploration
- create a `PR` from inline natural-language entry
- use `/pr/new` for mixed natural-language and structured creation
- create a `PR` through a structured form where `type` accepts arbitrary input with suggestion options from known event types
- create a `PR` through a structured form where `time_window` uses a batch or free UI mode and still resolves to one PR-owned time window
- create and publish `PR` drafts
- let natural-language creation stay simple while the system may map the intent to an existing Anchor Event context or synthesize a new `PR.type`

## 2. Collaboration Joining And Progression

- join and exit `PR`
- prompt notification subscription immediately after successful join when reminder registration is relevant for that PR
- post and read non-realtime PR messages, including operator-authored system messages inside the same PR thread
- confirm participation when the `Partner` submodule carries confirmation rules
- submit PR check-in feedback when the attendance module is active
- progress status based on partner thresholds and time windows

## 3. Event-Context Collaboration

- browse Anchor Events and time-pool driven PR discovery surfaces
- enter `PR` from Anchor Event context
- keep the current event-context `PR` detail page focused on facts, participation, booking support, and persistent notification-subscription management
- open the PR message experience through `/pr/:id/messages`
- open the participant roster modal from the facts-card participant row
- open venue images through a clickable label row aligned with other facts-card entry rows
- open participant profile pages from clickable participant badges
- re-discover other active Anchor Events from current Anchor Event and PR context
- create `PR` from Anchor Event context as one assisted mode inside the Anchor Event domain
- review alternative recommendations under the same time-pool rules
- view booking support and resource-support semantics

## 4. Identity And Revisit

- restore local account plus PIN continuity
- log in and bind through WeChat
- access `/me`
- access `/pr/mine`
- view participant profile pages in read-only mode

## 5. Distribution And Attribution

- generate system share links
- support WeChat sharing
- generate Xiaohongshu captions and posters
- carry `spm` attribution through the link chain

## 6. Notifications And Reliability

- support subscription reminders
- notify booking results
- notify new-partner events
- notify new PR messages
- model remaining send quota
- release unconfirmed slots when the `Partner` submodule carries confirmation rules

## 7. Support And Operations

- route support entrypoints through "Need Help"
- route `/contact-support` toward `/contact-author` and `/about`
- expose repository and frontend/backend commit hashes in `/about`
- let operator tooling maintain Anchor/Event/POI/Booking Support semantics
- let operator tooling process booking fulfillment results and release invalid booking contacts
- let configuration materially shape the real user experience
