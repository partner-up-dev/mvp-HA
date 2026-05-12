# Design Constraints

## Product Scope

- BI dashboard v1 should focus on Anchor Event -> PR conversion.
- Different Anchor Event landing modes should have separate funnels.
- The first dashboard should explain how users enter an Anchor Event landing surface and progress toward PR creation, PR join, or PR waitlist.

## User Telemetry

- User-behavior collection can be rebuilt from first principles.
- Existing telemetry implementation and event names are reference evidence.
- User telemetry event storage should use telemetry naming, such as `telemetry_events` or `user_telemetry_events`.
- Analytics is the read and interpretation layer over telemetry and business state.
- Raw telemetry storage uses telemetry naming. Analytics naming belongs to read/query surfaces.

## Internal Behavior Telemetry

- Program-internal behavior collection belongs to a future implementation track.
- The design should keep room for future OTLP-aligned traces, logs, and metrics.
- User telemetry and internal telemetry should remain separate collection tracks.
- The two tracks should be joinable later through correlation fields such as request id, correlation id, trace id, and business object ids.

## Authorization And Routes

- BI dashboard route: `/admin/analytics`.
- Lightweight BI entry route: `/bi?code=...`.
- `/bi?code=...` uses `code` as the analytics user's pin and redirects to `/admin/analytics` after login.
- The analytics service user is a new seed user.
- The analytics role is parallel to admin/service access.
- Existing seed admin user should also receive analytics capability.
- An analytics-only user can access `/admin/analytics`. General admin capabilities remain under admin authorization.
