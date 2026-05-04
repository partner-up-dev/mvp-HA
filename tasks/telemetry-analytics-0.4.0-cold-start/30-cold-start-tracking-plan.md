# Cold-Start Tracking Plan

## Common Context

The cold-start events should carry these semantics when available:

- `occurredAt`: transport envelope timestamp.
- `sourceQr` or `spm`: QR/source attribution.
- `eventId`: anchor event id.
- `activityType`: event or PR type.
- `locationType`: `preset` or `user_submitted`.
- `timeType`: `preset` or `user_submitted`.
- `requestId`: command/request correlation id when available.
- `userIdHash`: stable privacy-safe user linkage when the backend can provide it.
- `actionResult`: `success`, `failure`, `blocked`, or a stricter local enum.
- `failureCode`: stable machine-readable failure code.
- `failureReason`: human-readable fallback or normalized reason.

## Event: `anchor_event_form_started`

Semantic target: user began Form Mode input.

Source: frontend.

Fire point:

- First meaningful interaction in the Form Mode selection state, such as changing location, changing time, changing preferences, or starting the long-press CTA.
- Fire once per mounted Form Mode journey or per route-level journey token.

Suggested payload:

```ts
{
  eventId: number;
  activityType?: string;
  sourceQr?: string;
  spm?: string;
  trigger: "location" | "time" | "preference" | "primary_cta";
  hasDefaultSelection: boolean;
  locationId?: string;
  locationType?: "preset" | "user_submitted";
  startAt?: string;
  timeType?: "preset" | "user_submitted";
  preferenceCount?: number;
}
```

## Event: `anchor_event_recommendation_result`

Semantic target: Form Mode recommendation command outcome.

Source: frontend telemetry around `POST /api/events/:eventId/form-mode/recommendation`; backend result event can be added later if command IDs become durable.

Fire point:

- On success after the recommendation response returns.
- On failure after the API error is resolved.

Suggested payload:

```ts
{
  eventId: number;
  activityType?: string;
  locationId: string;
  locationType: "preset" | "user_submitted";
  startAt: string;
  timeType: "preset" | "user_submitted";
  preferenceCount: number;
  actionResult: "success" | "failure";
  outcome?: "matched" | "no_match";
  matchedPrId?: number | null;
  candidateCount?: number;
  failureCode?: string;
  failureReason?: string;
}
```

## Event: `event_assisted_create_result`

Semantic target: create fallback command outcome from Form Mode.

Source: frontend telemetry around `POST /api/pr/new/form`, paired with backend `pr.created` domain facts for durable creation truth.

Fire point:

- On create fallback success before navigation to created PR.
- On failure after API error handling, including WeChat auth blocking cases when observable.
- On replay after WeChat auth when the pending action resumes.

Suggested payload:

```ts
{
  eventId: number;
  prId?: number;
  activityType?: string;
  locationId: string;
  locationType: "preset" | "user_submitted";
  startAt: string;
  timeType: "preset" | "user_submitted";
  preferenceCount: number;
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}
```

## Event: `pr_join_result`

Semantic target: PR join command outcome across PR detail, Form Mode matched handoff, and Form Mode candidate joins.

Source: frontend telemetry in `PRJoinFlow.vue` or the shared PR action layer.

Fire point:

- On join success after `POST /api/pr/:id/join` succeeds.
- On join failure after gate refresh/auth handling/error resolution completes enough to classify the result.
- Gate-unresolved should be classified as `blocked` with a stable failure code.

Suggested payload:

```ts
{
  prId: number;
  eventId?: number;
  activityType?: string;
  entrySurface?: "pr_detail" | "form_mode_matched" | "form_mode_candidate";
  candidateRank?: number | null;
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}
```

## Event: `pr_waitlist_result`

Semantic target: waitlist command outcome when a full PR still admits pending slots.

Source: frontend telemetry in `PRJoinFlow.vue` or the shared PR action layer.

Fire point:

- Same as `pr_join_result`, but only when `PRJoinFlow` runs with `mode = "WAITLIST"`.

Suggested payload:

```ts
{
  prId: number;
  eventId?: number;
  activityType?: string;
  entrySurface?: "pr_detail" | "form_mode_matched" | "form_mode_candidate";
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}
```

## Existing Events To Preserve

- `page_view`: covers landing/request detail views when route context is sufficient.
- `anchor_event_form_impression`: useful as Form Mode surface exposure.
- `anchor_event_form_recommendation_impression`: useful as recommendation/candidate exposure.
- `anchor_event_form_result_action_click`: useful as post-result intent click.
- `anchor_event_form_create_fallback_click`: useful as create intent.
- `pr_primary_cta_click`: useful as detail-page intent.
- Existing success-only events in target cold-start paths should be replaced by result events in 0.4.0.
