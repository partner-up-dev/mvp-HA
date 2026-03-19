# Result

## Scope Delivered

- Replaced the old Anchor PR `economy` model with a dedicated `booking-support` domain.
- Renamed the public route from `/apr/:id/economy` to `/apr/:id/booking-support`.
- Renamed the user-facing page semantics from "经济信息" to "预订与资助".
- Split support modeling into:
  - event-level support resources
  - batch-level support overrides
  - PR-level resolved support snapshots
- Added a simple password-protected admin page for managing support resources and batch overrides:
  - frontend: `/admin/booking-support`
  - backend: `/api/admin/session`, `/api/admin/events/:eventId/booking-support-resources`, `/api/admin/batches/:batchId/booking-support-overrides`

## Data Model

- Removed old Anchor Event / Batch / PR economy fields tied to `Model A / Model C`.
- Added new tables:
  - `anchor_event_support_resources`
  - `anchor_event_batch_support_overrides`
  - `anchor_pr_support_resources`
- Added support resolution/materialization flow so auto-created Anchor PRs inherit booking/support rules from event + batch configuration.
- Reworked reimbursement eligibility to depend on resolved support rows with `PLATFORM_POSTPAID`, instead of legacy payment-model flags.
- Reworked effective booking-deadline logic to derive from resolved PR support resources instead of a single legacy field on Anchor PR.

## UX Changes

- Anchor PR detail page now links to `预订与资助`.
- Public booking-support page is summary-first and rule-driven:
  - shows human-facing summary and detailed rules
  - explains booking flow and settlement timing in plain language
  - avoids exposing raw subsidy ratio/cap as primary user-facing copy
- Added admin editing UI with replace-style writes for event templates and batch overrides.

## Schema / Seed Reset

- Applied reset-only schema strategy.
- Removed the previous generated Drizzle baseline and replaced it with a fresh single baseline:
  - `apps/backend/drizzle/0000_booking_support_baseline.sql`
- Rewrote seed data to the new support-resource model:
  - badminton sample with venue + activity items
  - study sprint sample with lightweight non-cash support
  - batch override sample for event-specific booking/support behavior

## Documentation Updated

- `docs/product/overview.md`
- `docs/product/glossary.md`
- `docs/product/features/find-partner.md`

## Verification

- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm build`

Both passed after the refactor.
