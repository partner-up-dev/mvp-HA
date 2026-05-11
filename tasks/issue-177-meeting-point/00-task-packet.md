# Issue 177 Meeting Point

## Objective & Hypothesis

Implement the public `PR` meeting point fact that answers where participants should meet.

Hypothesis:

- `meetingPoint` is a public auxiliary PR fact shown under the primary location in the PR facts card.
- The effective value is backend-resolved by fallback order: PR override, Anchor Event location-specific config, Anchor Event default config, then POI config.
- Anchor Event context continues to follow the current type-derived owner model: `PartnerRequest.type === AnchorEvent.type`.
- Updating the effective meeting point does not change critical PR facts, participation, confirmation, or join state.
- Effective meeting point changes notify current active participants through a dedicated WeChat subscription notification kind.

## Guardrails Touched

- PR root owns PR-level meeting point override and public detail read payload.
- Anchor Event owns event-level and location-specific meeting point configuration.
- POI owns venue-level fallback meeting point configuration.
- Notification owns user attention policy, scheduling, dispatch revalidation, delivery records, and subscription quota consumption.
- Frontend renders backend-derived meeting point facts and does not recreate fallback policy.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend test:unit`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --filter @partner-up-dev/backend build`

## Working Notes

- User confirmed code naming as `meetingPoint`.
- Dedicated WeChat subscription template field mapping:
  - `phrase1.DATA`: `碰头地点`
  - `thing2.DATA`: `系统`
  - `time3.DATA`: current time
  - `thing6.DATA`: `meetingPoint.description`
