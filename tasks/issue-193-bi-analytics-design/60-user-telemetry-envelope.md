# User Telemetry Envelope

## Design Goal

Define the rebuilt user-behavior telemetry model used by the first BI dashboard.

This model captures product behavior facts. Analytics reads these facts and business tables to compute funnel metrics.

## Naming

Recommended raw telemetry tables:

- `user_telemetry_journeys`
- `user_telemetry_events`
- `user_telemetry_segments`

Rationale:

- `user_telemetry_*` names clearly identify user-behavior telemetry.
- Future program-internal telemetry can follow an OTLP-oriented path with its own storage/export model.
- Analytics modules read from telemetry tables and business state.

## Event Envelope

Each user telemetry event should have a stable envelope:

```ts
type UserTelemetryEventEnvelope = {
  eventId: string;
  eventName: string;
  eventKind: "page" | "track" | "identify" | "group";
  occurredAt: string;
  receivedAt: string;
  source: "frontend" | "backend";

  anonymousId: string | null;
  userIdHash: string | null;
  appJourneyId: string;
  segmentId: string | null;

  routePath: string | null;
  routeName: string | null;
  referrer: string | null;

  startSpm: string | null;
  currentSpm: string | null;
  sourceQr: string | null;

  correlationId: string | null;
  requestId: string | null;
  traceId: string | null;

  eventIdRef: number | null;
  prIdRef: number | null;
  cardKey: string | null;
  segmentKey: string | null;
  properties: Record<string, unknown>;
};
```

## Event Kind

`eventKind` follows Segment-like semantics:

- `page`: a route or major surface becomes visible.
- `track`: a user action, impression, result, or product state transition becomes observable.
- `identify`: visitor identity is associated with a stable user identity.
- `group`: future grouping of user to a stable organization/community/beta group context.

BI v1 mainly uses `page` and `track`.

## Event Name Style

Recommended event name style: dot-separated hierarchy.

Format:

```text
<domain>.<object_or_surface>.<behavior>
```

Rules:

- Use singular domain names.
- Use `.` for hierarchy.
- Use `_` inside one hierarchy level when the phrase has multiple words.
- Use user-observable behavior words for the final segment.

Examples:

- `anchor_event.landing.viewed`
- `anchor_event.form.started`
- `anchor_event.recommendation.requested`
- `anchor_event.recommendation.returned`
- `anchor_event.candidate.engaged`
- `anchor_event.assisted_create.started`
- `pr.entry.reached`
- `pr.commitment.result`

## Subject Fields

Use typed subject fields for important business objects.

Examples:

- Anchor Event page view: `event_id_ref = event_id`
- PR detail page view: `pr_id_ref = pr_id`
- Card impression: `event_id_ref = event_id`, `card_key = card_key`

Additional object-specific details live in `properties`.

## Properties

Properties carry event-specific facts.

Common Anchor Event properties:

- `event_id`
- `assigned_mode`
- `rendered_mode`
- `assignment_revision`
- `is_timeout_fallback`
- `segment_id`

Common PR properties:

- `pr_id`
- `entry_surface`
- `entry_type`
- `commitment_type`
- `action_result`
- `failure_code`
- `failure_reason`

FORM properties:

- `trigger`
- `location_id`
- `location_type`
- `start_at`
- `time_type`
- `preference_count`
- `recommendation_outcome`
- `matched_pr_id`
- `candidate_count`
- `candidate_rank`

CARD_RICH properties:

- `card_key`
- `card_rank`
- `card_count`
- `target_pr_id`
- `card_action`

LIST properties:

- `date_key`
- `date_count`
- `visible_pr_count`
- `row_rank`
- `is_expired_date`

## Table Shape

### `user_telemetry_journeys`

Purpose: one row per app journey.

Suggested columns:

```text
id uuid primary key
anonymous_id text null
user_id_hash text null
started_at timestamp not null
last_seen_at timestamp not null
start_route text null
start_route_name text null
start_referrer text null
start_spm text null
current_spm text null
start_source_qr text null
current_source_qr text null
start_event_id integer null
start_pr_id integer null
entry_kind text null
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Recommended indexes:

- `(started_at)`
- `(start_spm, started_at)`
- `(anonymous_id, started_at)`

### `user_telemetry_segments`

Purpose: one row per meaningful product segment inside an app journey.

Suggested columns:

```text
id uuid primary key
app_journey_id uuid not null
segment_kind text not null
started_at timestamp not null
ended_at timestamp null
event_id integer null
pr_id integer null
assigned_mode text null
rendered_mode text null
assignment_revision text null
segment_start_route text null
segment_start_spm text null
segment_start_source_qr text null
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Recommended indexes:

- `(segment_kind, started_at)`
- `(app_journey_id, started_at)`
- `(event_id, rendered_mode, started_at)`

### `user_telemetry_events`

Purpose: append-only user behavior facts.

Suggested columns:

```text
id uuid primary key
event_name text not null
event_kind text not null
source text not null
anonymous_id text null
user_id_hash text null
app_journey_id uuid not null
segment_id uuid null
route_path text null
route_name text null
referrer text null
start_spm text null
current_spm text null
source_qr text null
correlation_id text null
request_id text null
trace_id text null
event_id_ref integer null
pr_id_ref integer null
card_key text null
segment_key text null
properties jsonb not null
occurred_at timestamp not null
received_at timestamp not null default now()
```

Recommended indexes:

- `(event_name, occurred_at)`
- `(app_journey_id, occurred_at)`
- `(segment_id, occurred_at)`
- `(event_id_ref, occurred_at)`
- `(pr_id_ref, occurred_at)`
- `(card_key, occurred_at)`
- `(current_spm, occurred_at)`
- `(correlation_id)`
- `(request_id)`

## Correlation

`correlation_id` should be generated by frontend for command-style actions when the user starts an action.

Examples:

- recommendation request
- event-assisted create
- PR join
- PR waitlist

The same `correlation_id` travels through the API request body or header and returns in the result telemetry event. Future OTLP logs/traces can include the same id.

## Event Volume Policy

High-volume impression events should use dedupe rules at the source.

Recommended v1 rules:

- `landing_viewed`: once per segment.
- `form_started`: once per FORM segment.
- `card_seen`: once per `card_key` per segment.
- `pr_row_seen`: once per `pr_id` per segment.
- `page`: once per route render.
- result events: once per submitted command attempt.

## Decisions

- Proposed table names: `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events`.
- Use generic `segment_id` in v1.
- Carry `correlation_id` via request header and request body.
- Use typed nullable columns for core subject ids: `event_id_ref`, `pr_id_ref`, `card_key`, and `segment_key`.
