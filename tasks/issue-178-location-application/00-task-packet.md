# Issue 178 Location Application

## Objective & Hypothesis

- Objective: let users submit new POI location applications from Form Mode, let operators review them in the existing POI admin surface, and let users revisit their own submissions.
- Hypothesis: modeling the application lifecycle directly on `POI` keeps location truth unified while preserving the existing Anchor Event `locationPool` gate for Form Mode availability.

## Guardrails Touched

- `POI.id` remains the user-visible location name.
- Newly submitted POIs start as `PENDING`.
- Form Mode location options are still constrained by `AnchorEvent.locationPool` and only published POIs should contribute gallery/availability context.
- Publishing a POI does not automatically add it to every Anchor Event.
- Rejected POIs may carry a human-readable reason for the submitter.
- Existing POIs must migrate to `PUBLISHED` so current public flows remain available.

## Verification

- `pnpm --filter @partner-up-dev/backend db:lint`
- `DATABASE_URL` loaded from `apps/backend/.env`; `pnpm --filter @partner-up-dev/backend db:migrate`
  - applied `drizzle/0040_poi_application_status.sql`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/backend test:unit -- poi-application`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Agent-browser E2E on local `4001` / `4002`:
  - submitted `E2E-POI-PUBLISH-20260504-2207` and `E2E-POI-REJECT-20260504-2207`
  - logged in as admin with seeded UUID and `admin123`
  - published one application and rejected one with a visible user-facing reason
  - verified the user application page shows `已发布`, `已驳回`, and the reject reason
  - verified the Me page exposes the application entry
  - forced Anchor Event 1 landing to FORM mode and clicked the location plus card into `/locations/apply?fromEvent=1`
  - verified the plus card now uses two-step intent: first interaction activates the card and keeps `/e/1`; second click navigates to `/locations/apply?fromEvent=1`
