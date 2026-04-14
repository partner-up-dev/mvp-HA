# Task Packet - Issue 155 Event-Specific Beta Groups

## MVT Core

- Objective & Hypothesis: Complete issue #155 by making beta-group access activity-specific instead of one generic product beta group. Hypothesis: storing the beta-group QR code on `anchor_events` and rendering that event-owned value on event and about surfaces will keep the entrypoint explicit without changing Anchor PR messaging or join authority.
- Guardrails Touched:
  - Product PRD: Anchor Event browsing and Support/About workflows.
  - Product TDD: `GET /api/events`, `/events/:eventId`, `/about`, and config/state authority boundaries.
  - Backend: `anchor_events` schema, public event read payloads, admin event maintenance, seed/migration workflow.
  - Frontend: Anchor Event Page list/card mode entry behavior, About Page beta-group selection, Contact Support routing.
- Verification:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/backend build`
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/backend db:lint`

## Execution Notes

- Input Type: Intent.
- Active Mode: Execute.
- Scope Decision:
  - Treat "contact your partner" as an event-support coordination function, not a replacement for persisted PR Messaging.
  - Keep official-account QR and other public config values in `/api/config/public/:key`.
  - Move beta-group QR ownership to `anchor_events.beta_group_qr_code`.
- Excluded for this issue:
  - new chat or participant messaging semantics
  - new standalone beta-group endpoint
  - per-user beta-group membership tracking

## Outcome

- Added `anchor_events.beta_group_qr_code` as the event-owned beta-group QR source.
- Exposed `betaGroupQrCode` through public Anchor Event list/detail payloads and admin Anchor Event create/update/workspace flows.
- Replaced the generic beta-group config usage with event-specific beta-group cards on `/events/:eventId` and `/about`.
- Changed `/contact-support` beta-group entry to route users to `/about#beta-groups` so they can choose an activity group.
- Removed the old generic beta-group modal/hook and removed `wechat_beta_group_qr_code` from the public config whitelist/seed path.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/backend typecheck`
- Passed: `pnpm --filter @partner-up-dev/backend build`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Blocked: `pnpm --filter @partner-up-dev/backend db:lint`
  - Current blocker is an unrelated duplicate migration prefix in the working tree: `drizzle/0009_groovy_roughhouse.sql` conflicts with `drizzle/0009_user_notification_opt_remaining_counts.sql`.
