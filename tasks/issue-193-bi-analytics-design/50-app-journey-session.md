# App Journey And Session Lifecycle

## Design Goal

Define a visit-level identifier that lets BI connect the user's application entry, Anchor Event landing behavior, and downstream PR actions.

Working term: `app_journey_id`.

## Three Identity Layers

### Visitor Identity

Purpose: recognize the same browser/user across visits.

Fields:

- `anonymous_id`: long-lived browser visitor id.
- `user_id_hash`: backend-issued privacy-safe user linkage when available.

Storage:

- `anonymous_id` lives in local storage.
- `user_id_hash` is attached by backend or session bootstrap when available.

### App Journey

Purpose: represent one continuous application visit.

Fields:

- `app_journey_id`
- `started_at`
- `last_seen_at`
- `start_route`
- `start_route_name`
- `start_referrer`
- `start_spm`
- `start_source_qr`
- `start_event_id`
- `start_pr_id`
- `entry_kind`

Storage:

- primary client storage: session storage
- each telemetry event updates `last_seen_at`

### Business Segment

Purpose: represent a meaningful product journey inside the app visit.

Examples:

- Anchor Event landing segment
- PR detail participation segment
- share generation segment

Recommended Anchor Event segment fields:

- `anchor_event_segment_id`
- `app_journey_id`
- `event_id`
- `assigned_mode`
- `rendered_mode`
- `assignment_revision`
- `segment_start_route`
- `segment_start_spm`
- `segment_start_source_qr`

## Journey Start Rules

Start a new `app_journey_id` when one of these happens:

- the browser has no active journey in session storage
- the active journey has expired by inactivity timeout
- the user opens the app in a new browser tab with a new session storage context

Recommended inactivity timeout: 30 minutes since `last_seen_at`.

The first route that creates the journey owns immutable start fields:

- `start_route`
- `start_referrer`
- `start_spm`
- `start_source_qr`
- `entry_kind`

## Journey Continuation Rules

Continue the same `app_journey_id` across:

- SPA route changes
- page reloads in the same tab
- WeChat OAuth round trips in the same browser context
- authenticated session upgrades
- route transitions from `/e/:eventId` to `/pr/:id`
- PR join, waitlist, create, share, and notification prompt flows that happen before expiry

Each telemetry event refreshes `last_seen_at`.

## Journey Attribution Rules

The app journey keeps immutable start attribution.

Business segments also capture their own segment start attribution. This lets BI answer both:

- where the app visit began
- where the Anchor Event funnel segment began

When a downstream PR action carries `app_journey_id` and `anchor_event_segment_id`, BI can attribute the action to:

- the app entry source
- the Anchor Event
- the rendered landing mode
- the concrete PR action surface

## Source Handling

Recommended source fields:

- `start_spm`: first valid `spm` at app journey creation
- `current_spm`: latest valid `spm` seen in the active journey
- `segment_start_spm`: valid `spm` when the business segment starts
- `source_qr`: QR/source value when available
- `referrer`: browser referrer at journey start

`start_spm` supports acquisition reporting. `segment_start_spm` supports funnel reporting when the user enters Anchor Event after earlier navigation.

## End And Expiry Semantics

Browser exit is observed imperfectly, so BI uses expiry semantics.

Recommended journey end fields can be derived in queries:

- `ended_at = max(occurred_at)` for the journey
- `duration_ms = ended_at - started_at`
- `is_bounced = only one page or no meaningful interaction`

The client may emit a best-effort `app_journey_closed` event on page hide or unload, but BI should rely on expiry and last event time.

## Relationship To Current Implementation

Current frontend telemetry has a session-storage `sessionId` and session-storage `spm`.

For the rebuilt user telemetry model:

- `sessionId` can evolve into `app_journey_id`.
- source attribution should move into journey start and business segment fields.
- downstream PR action events should carry `app_journey_id` and relevant segment ids.

## Decisions

- Use `app_journey_id` as the product-facing journey field name.
- Persist journey metadata in `user_telemetry_journeys`.
- Use 30 minutes of inactivity as the initial expiry threshold.
- A new valid `spm` inside an active journey updates current attribution and can start a business segment. The app journey start attribution remains fixed.
