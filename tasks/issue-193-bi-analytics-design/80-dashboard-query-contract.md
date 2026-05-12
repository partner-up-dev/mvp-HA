# Analytics Dashboard And Query Contract

## Design Goal

`/admin/analytics` v1 shows the Anchor Event -> PR conversion funnel, split by Anchor Event landing mode.

The dashboard should help an operator answer:

- which landing mode creates more PR commitment
- where users drop in each mode
- whether source, event, or assignment revision changes conversion
- which create/join/waitlist outcomes explain final conversion

## Page Route

Frontend route:

```text
/admin/analytics
```

Access:

- requires `analytics`

Navigation:

- admin navigation should render links allowed by the current role set
- analytics-only users see the analytics route
- service users with analytics role see analytics plus service-owned admin routes

## Page Layout

Recommended v1 panels:

1. Filter rail
2. KPI summary strip
3. Mode comparison table
4. Per-mode funnel panels
5. Outcome breakdown
6. Source breakdown
7. Failure and blocked reason table

## Filters

Required filters:

- date range: `startAt`, `endAt`
- event: `eventId`
- source: `spm` or `sourceQr`
- assignment revision: `assignmentRevision`
- rendered mode: `FORM`, `CARD_RICH`, `LIST`

Default filter:

- last 7 days
- all active events
- all sources
- all rendered modes

Date interpretation:

- API accepts ISO timestamps.
- UI can offer product-local presets such as today, yesterday, last 7 days, last 30 days.

## KPI Summary

Recommended fields:

- `journeys`: app journeys that entered an Anchor Event landing segment
- `prExposureJourneys`: journeys that saw one or more PR candidates
- `prEntryJourneys`: journeys that chose a concrete PR path
- `prCommitmentJourneys`: journeys with successful create, join, or waitlist
- `commitmentRate`: `prCommitmentJourneys / journeys`
- `createSuccess`: successful event-assisted PR creates
- `joinSuccess`: successful PR joins
- `waitlistSuccess`: successful waitlist entries

## Mode Comparison

One row per rendered mode:

```ts
type AnalyticsModeComparisonRow = {
  renderedMode: "FORM" | "CARD_RICH" | "LIST";
  journeys: number;
  prExposureJourneys: number;
  prEntryJourneys: number;
  prCommitmentJourneys: number;
  commitmentRate: number;
  createSuccess: number;
  joinSuccess: number;
  waitlistSuccess: number;
};
```

## Funnel Panels

Each mode panel uses the mode-specific steps from `40-funnel-steps.md`.

```ts
type AnalyticsFunnelStep = {
  stepKey: string;
  label: string;
  eventName: string | null;
  behavior: string;
  journeyCount: number;
  eventCount: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
};

type AnalyticsModeFunnel = {
  renderedMode: "FORM" | "CARD_RICH" | "LIST";
  steps: AnalyticsFunnelStep[];
};
```

Example FORM behavior labels:

- `landing_viewed`: user saw the FORM landing surface
- `form_started`: user changed location/time/preference or started the primary CTA
- `recommendation_requested`: user submitted selected conditions
- `recommendation_returned`: user saw the recommendation result
- `candidate_engaged`: user tapped candidate detail or join
- `event_assisted_create_started`: user tapped fallback create
- `pr_entry_reached`: user reached or acted on a concrete PR path
- `pr_commitment_result`: user completed create, join, or waitlist

## Outcome Breakdown

```ts
type AnalyticsOutcomeBreakdownRow = {
  renderedMode: "FORM" | "CARD_RICH" | "LIST";
  commitmentType: "create" | "join" | "waitlist";
  actionResult: "success" | "blocked" | "failure";
  journeyCount: number;
  eventCount: number;
};
```

## Source Breakdown

```ts
type AnalyticsSourceBreakdownRow = {
  sourceKey: string;
  sourceType: "start_spm" | "unknown";
  renderedMode: "FORM" | "CARD_RICH" | "LIST";
  journeys: number;
  prCommitmentJourneys: number;
  commitmentRate: number;
};
```

## Failure Breakdown

```ts
type AnalyticsFailureBreakdownRow = {
  renderedMode: "FORM" | "CARD_RICH" | "LIST";
  eventName: string;
  commitmentType: "create" | "join" | "waitlist" | null;
  failureCode: string;
  failureReason: string | null;
  journeyCount: number;
  eventCount: number;
};
```

## Backend API

V1 endpoint:

```text
GET /api/analytics/anchor-event-funnel
```

Query parameters:

```ts
type AnchorEventFunnelQuery = {
  startAt?: string;
  endAt?: string;
  eventId?: string;
  spm?: string;
  sourceQr?: string;
  assignmentRevision?: string;
  renderedMode?: "FORM" | "CARD_RICH" | "LIST";
};
```

Response:

```ts
type AnchorEventFunnelResponse = {
  filters: {
    startAt: string;
    endAt: string;
    eventId: number | null;
    spm: string | null;
    sourceQr: string | null;
    assignmentRevision: string | null;
    renderedMode: "FORM" | "CARD_RICH" | "LIST" | null;
  };
  summary: {
    journeys: number;
    prExposureJourneys: number;
    prEntryJourneys: number;
    prCommitmentJourneys: number;
    commitmentRate: number;
    createSuccess: number;
    joinSuccess: number;
    waitlistSuccess: number;
  };
  modes: AnalyticsModeComparisonRow[];
  funnels: AnalyticsModeFunnel[];
  outcomes: AnalyticsOutcomeBreakdownRow[];
  sources: AnalyticsSourceBreakdownRow[];
  failures: AnalyticsFailureBreakdownRow[];
};
```

## Query Source Tables

Primary tables:

- `user_telemetry_journeys`
- `user_telemetry_segments`
- `user_telemetry_events`

Business-state cross-check sources:

- `partner_requests`
- `partners`

Business tables can validate created PR ids, join/waitlist state, and final PR status. Funnel step counts should be driven by user telemetry events so mode-level attribution stays exact.

## Metric Semantics

### Journey Count

Count distinct `app_journey_id`.

### Step Count

For each step:

- `journeyCount`: distinct journeys reaching the step
- `eventCount`: raw event count for command attempts or impressions

### Conversion From Previous

`current_step.journeyCount / previous_step.journeyCount`

### Conversion From Start

`current_step.journeyCount / first_step.journeyCount`

### Commitment Rate

`prCommitmentJourneys / journeys`

## UI Interaction

Dashboard interactions:

- changing filters refetches the endpoint
- selecting a mode row focuses the corresponding mode funnel panel
- selecting a source row applies source filter

## Future Extensions

- drilldown event list
- CSV export
- time-series trend panel
- OTLP trace/log links through `correlation_id`, `request_id`, and `trace_id`
- retention and revisit analysis by `anonymous_id`

## Open Decisions

- V1 uses one aggregate endpoint.
- V1 source breakdown groups by `start_spm`.
- Time-series trend is a future extension.
- Raw event drilldown is a future extension.
