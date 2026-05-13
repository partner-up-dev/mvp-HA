# Open Questions

## Funnel Definition

- Current status: mode-separated funnel steps in `40-funnel-steps.md` are the working design.
- Decide which journey cohorts the dashboard should compare first: `rendered_mode`, `assigned_mode`, source, event, or assignment revision.
- Decide whether downstream PR joins after canonical detail entry remain attributed to the originating app journey.
- Current decision: dashboard primary conversion uses unified `PR commitment`, with create, join, and waitlist as breakdown dimensions.

## Next Discussion Areas

- Review `50-app-journey-session.md` and confirm journey lifecycle decisions.
- Review `60-user-telemetry-envelope.md` and confirm user telemetry envelope/table decisions.
- Review `70-authorization-options.md` and select the authorization/login combination.
- Review `80-dashboard-query-contract.md` and confirm dashboard/query contract decisions.
- Review `90-bi-login-flow.md` for `/bi?code=...` login flow.
- Review `100-implementation-slices.md` for implementation order.

## App Journey Decisions

- Current decision: use `app_journey_id`.
- Current decision: persist `user_telemetry_journeys`.
- Current decision: 30-minute inactivity expiry.
- Current decision: keep `start_spm` fixed and record later attribution through `current_spm` plus segment start fields.

## User Telemetry Decisions

- Confirm `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events` names.
- Current decision: use generic `segment_id`.
- Current decision: carry command `correlation_id` through request header and request body.
- Current decision: use typed nullable object id columns.
- Current decision: use dot-separated event names such as `anchor_event.landing.viewed`.

## Authorization Decisions

- Current decision: upgrade `users.role` to a text array.
- Current decision: JWT carries `roles`.
- Current decision: frontend route meta uses `requiredRoles`.
- Current decision: backend middleware uses generic `requireRoles(...)`.
- Current decision: frontend keeps admin session naming.
- Current decision: `/bi` reuses `POST /api/auth/admin/login`.
- Current decision: `/bi` scrubs code after successful login and redirect.

## Dashboard Query Decisions

- Current decision: use one aggregate endpoint.
- Current decision: source breakdown uses `start_spm`.
- Current decision: time-series trend is a future extension.
- Current decision: raw event drilldown is a future extension.
