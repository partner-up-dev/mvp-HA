# Decisions

## 2026-05-11

- BI dashboard v1 is the Anchor Event -> PR conversion funnel.
- Funnel views are separated by Anchor Event landing mode.
- User-behavior collection can discard the existing implementation foundation.
- Program-internal behavior collection belongs to a future implementation track.
- Future internal behavior collection should follow OTLP, and the user telemetry design should leave correlation room.
- Raw user telemetry should use telemetry naming. Analytics remains the read and interpretation layer.
- `/admin/analytics` is the BI dashboard route.
- `/bi?code=...` is the lightweight BI entry route and uses the query code as the analytics seed user's pin.
- Analytics service user is a new seed user.
- Analytics authorization is parallel to admin authorization.
- Existing seed admin user also gets analytics capability.
- Analytics-only access is limited to `/admin/analytics`.
- Upgrade `users.role` from one text value to a text array.

## 2026-05-12

- The mode-separated Anchor Event -> PR funnel in `40-funnel-steps.md` is accepted as the current working design.
- FORM, CARD_RICH, and LIST each keep their own funnel steps because they represent different user decision paths.
- `landing_journey_id` is generalized into `app_journey_id`.
- `app_journey_id` represents one continuous user visit from application entry to exit, expiry, or a clearly new visit.
- The Anchor Event landing funnel is one business segment inside an app journey.
- Funnel event discussion should describe the concrete user behavior behind each event name.
- The next design focus moves to telemetry envelope, app journey/session model, analytics authorization, and BI query/page shape.
- Session lifecycle design is recorded in `50-app-journey-session.md`.
- Use `app_journey_id` as the product-facing journey field name.
- Use `user_telemetry_journeys` as the v1 journey table.
- Keep journey `start_spm` immutable and track later source changes through `current_spm` and business segment source fields.
- Use 30 minutes of inactivity as the initial app journey expiry threshold.
- Use generic `segment_id` for business segments.
- Use typed subject columns in user telemetry events, including `event_id_ref`, `pr_id_ref`, `card_key`, and `segment_key`.
- Use dot-separated event names such as `anchor_event.landing.viewed`.
- Carry command `correlation_id` in both request header and request body.
- Authorization options are recorded in `70-authorization-options.md`.
- JWT carries `roles`.
- Frontend route meta uses `requiredRoles`.
- Backend authorization uses generic `requireRoles(...)`.
- Frontend keeps admin session naming.
- `/bi` reuses `POST /api/auth/admin/login`.
- `/bi` scrubs code after successful login and redirect.
- Dashboard and query contract draft is recorded in `80-dashboard-query-contract.md`.
- Dashboard v1 uses one aggregate endpoint: `GET /api/analytics/anchor-event-funnel`.
- Dashboard v1 source breakdown groups by `start_spm`.
- Time-series trend is a future extension.
- Raw event drilldown is a future extension.
- Dashboard v1 primary conversion uses unified `PR commitment`, with create, join, and waitlist as breakdown dimensions.
- LIST row exposure dedupes by `pr_id` per segment.
- CARD_RICH skip behavior is diagnostic context around card action behavior.
- `/bi` login flow is recorded in `90-bi-login-flow.md`.
- `/bi` hard-codes analytics seed user id in the page implementation.
- `/bi` failed login stays on the page, shows simple error text, and provides a home button.
- Implementation slices are recorded in `100-implementation-slices.md`.
