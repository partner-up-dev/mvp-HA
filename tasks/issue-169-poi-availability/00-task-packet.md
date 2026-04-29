# Issue 169 POI Availability

## Objective & Hypothesis

Add POI-owned availability rules that constrain PR time windows.

Hypothesis:

- POI is the owner of location-specific availability, like venue operating hours.
- Missing POI or empty `availabilityRules` means the location is available all day.
- A PR time window is valid only when the full window is covered by POI availability.
- Structured recurrence is the durable contract; cron is not used as the core contract.
- PR create, publish, and edit guard availability at the backend command boundary.
- Anchor Event surfaces can derive create options from backend availability projections.

## Guardrails Touched

- PR root remains the owner of persisted `location` and `time`.
- POI owns location-specific capacity and availability.
- Anchor Event owns its own event location pool and event time pool.
- Backend owns user-readable Problem Details text and locale selection.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir apps/backend exec tsx --test src/domains/pr-core/services/poi-availability.service.test.ts src/lib/problem-details.test.ts`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --filter @partner-up-dev/frontend build`
- `git diff --check`
