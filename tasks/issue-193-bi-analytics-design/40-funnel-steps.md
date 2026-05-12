# Funnel Steps

## Design Goal

BI dashboard v1 explains how one `/e/:eventId` landing journey turns into PR commitment.

The dashboard separates `FORM`, `CARD_RICH`, and `LIST` funnels because each mode presents a different user decision path.

## Shared Funnel Concepts

### Journey Grain

Primary grain: one app journey.

Working id name: `app_journey_id`.

Meaning: one continuous user visit from entering the application to leaving, expiring, or starting a clearly new visit. The journey records where the user started, such as route, `spm`, QR source, referrer, and first Anchor Event context.

Recommended dimensions:

- `app_journey_id`
- `journey_start_route`
- `journey_start_source`
- `event_id`
- `assignment_revision`
- `assigned_mode`
- `rendered_mode`
- `is_timeout_fallback`
- `source_spm`
- `source_qr`
- `session_id`
- `anonymous_id`
- `user_id_hash`
- `landing_path`
- `occurred_at`

### Cohort

In this dashboard, a cohort is the group of journeys selected for comparison.

Examples:

- all journeys rendered as `FORM` for one event in one date range
- all journeys from one `spm`
- all journeys assigned `CARD_RICH` under one `assignment_revision`

The dashboard compares cohorts by counting how many journeys reach each step.

### Conversion Levels

- `PR exposure`: the user sees one or more PR candidates.
- `PR entry`: the user chooses a concrete PR path from the Anchor Event surface.
- `PR commitment`: the user creates a PR, joins a PR, or enters a PR waitlist.

The dashboard should show all three levels so marketing can distinguish weak interest from durable collaboration intent.

### PR Entry User Behaviors

`PR entry` includes these user behaviors:

- opens a PR detail page from a candidate card, list row, or matched recommendation
- taps a join action attached to a concrete PR candidate
- taps a waitlist action attached to a concrete PR candidate
- reaches the created PR detail page after event-assisted create succeeds

### Attribution Rule

PR commitment is attributed back to the originating app journey when a carried `app_journey_id` or equivalent correlation key is present on the downstream PR action.

## FORM Funnel

FORM mode is an intent-capture funnel. The user first expresses desired conditions, then sees backend-authored PR recommendations or creates a PR from the selected conditions.

Recommended steps:

1. `landing_viewed`
   - User opens `/e/:eventId` and the page renders `FORM`.
   - Source: user telemetry.
2. `form_started`
   - User changes location, changes time, changes preference, or starts pressing the primary CTA.
   - Source: user telemetry.
3. `recommendation_requested`
   - User completes the long-press CTA and submits selected conditions for recommendation.
   - Source: user telemetry, with future request correlation.
4. `recommendation_returned`
   - User sees the recommendation result panel after the backend returns.
   - Properties: `outcome = matched | no_match`, `matched_pr_id`, `candidate_count`.
   - Source: user telemetry plus optional backend business result.
5. `candidate_engaged`
   - User taps matched PR detail, matched PR join, candidate PR detail, or candidate PR join.
   - Properties: `candidate_rank`, `target_pr_id`, `action = detail | join`.
   - Source: user telemetry.
6. `event_assisted_create_started`
   - User taps the fallback create action from selected conditions.
   - Source: user telemetry.
7. `pr_entry_reached`
   - User reaches canonical `/pr/:id`, or directly starts join/waitlist for a concrete PR candidate.
   - Source: user telemetry.
8. `pr_commitment_result`
   - User completes create, join, or waitlist with a success, blocked, or failure result.
   - Properties: `commitment_type = create | join | waitlist`, `action_result`, `failure_code`.
   - Source: user telemetry plus business state.

Suggested primary conversion metrics:

- `form_started / landing_viewed`
- `recommendation_returned / form_started`
- `candidate_engaged / recommendation_returned`
- `pr_entry_reached / recommendation_returned`
- `pr_commitment_result.success / landing_viewed`

## CARD_RICH Funnel

CARD_RICH mode is a browsing and triage funnel. The user evaluates one active demand card at a time, then opens a PR or creates from an empty card state.

Recommended steps:

1. `landing_viewed`
   - User opens `/e/:eventId` and the page renders `CARD_RICH`.
   - Source: user telemetry.
2. `card_stack_loaded`
   - User sees the demand-card stack area.
   - Properties: `card_count`.
   - Source: user telemetry.
3. `card_seen`
   - User sees one active demand card.
   - Properties: `card_key`, `target_pr_id`, `rank`.
   - Source: user telemetry.
4. `card_action_taken`
   - User swipes/skips the active card or taps the detail action.
   - Properties: `action = skip | detail`, `target_pr_id`, `rank`.
   - Source: user telemetry.
5. `pr_entry_reached`
   - User reaches canonical `/pr/:id` from a card detail action.
   - Source: user telemetry.
6. `card_empty_create_started`
   - User starts create from the empty-card state using event-controlled time and location.
   - Source: user telemetry.
7. `pr_commitment_result`
   - User completes create, join, or waitlist with a success, blocked, or failure result.
   - Properties: `commitment_type = create | join | waitlist`, `action_result`, `failure_code`.
   - Source: user telemetry plus business state.

Suggested primary conversion metrics:

- `card_stack_loaded / landing_viewed`
- `card_action_taken.detail / card_seen`
- `pr_entry_reached / landing_viewed`
- `card_empty_create_started / landing_viewed`
- `pr_commitment_result.success / landing_viewed`

## LIST Funnel

LIST mode is an inventory-discovery funnel. The user browses date groups, time windows, and visible PR rows before opening or creating a PR.

Recommended steps:

1. `landing_viewed`
   - User opens `/e/:eventId` and the page renders `LIST`.
   - Source: user telemetry.
2. `list_loaded`
   - User sees date groups and PR rows.
   - Properties: `date_count`, `visible_pr_count`, `current_future_pr_count`, `expired_pr_count`.
   - Source: user telemetry.
3. `date_selected`
   - User taps a date tab.
   - Properties: `date_key`, `is_expired_date`, `visible_pr_count`.
   - Source: user telemetry.
4. `pr_row_seen`
   - User sees a PR row in the selected date panel.
   - Properties: `pr_id`, `time_window_start`, `location_id`, `row_rank`.
   - Source: user telemetry.
5. `pr_row_action_taken`
   - User taps an existing PR row or row action.
   - Properties: `pr_id`, `row_rank`, `date_key`.
   - Source: user telemetry.
6. `list_create_started`
   - User starts controlled event-assisted create from list mode.
   - Properties: `date_key`, `location_id`, `time_window_start`.
   - Source: user telemetry.
7. `pr_entry_reached`
   - User reaches canonical `/pr/:id` from list row or create handoff.
   - Source: user telemetry.
8. `pr_commitment_result`
   - User completes create, join, or waitlist with a success, blocked, or failure result.
   - Properties: `commitment_type = create | join | waitlist`, `action_result`, `failure_code`.
   - Source: user telemetry plus business state.

Suggested primary conversion metrics:

- `list_loaded / landing_viewed`
- `date_selected / list_loaded`
- `pr_row_action_taken / pr_row_seen`
- `list_create_started / landing_viewed`
- `pr_commitment_result.success / landing_viewed`

## Dashboard View Shape

Recommended v1 panels:

- Mode comparison: landing journeys, PR exposure, PR entry, PR commitment by mode.
- Per-mode funnel: step counts, step conversion, drop-off rate.
- Outcome breakdown: create / join / waitlist.
- Segment breakdown: event, source, assignment revision, date range.
- Failure breakdown: blocked and failed commitment results by stable code.

## Decisions And Remaining Questions

- Primary conversion uses unified `PR commitment`.
- Dashboard also breaks commitment down into create, join, and waitlist.
- CARD_RICH skip behavior belongs in diagnostic context around card action behavior.
- LIST `pr_row_seen` should dedupe per `pr_id` per segment.
