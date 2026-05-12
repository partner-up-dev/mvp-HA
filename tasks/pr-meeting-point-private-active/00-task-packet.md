# PR Meeting Point Active Privacy

## Objective & Hypothesis

- Objective: make PR meeting-point guidance private after the PR is `ACTIVE`, visible only to current active participants.
- Hypothesis: enforcing this in the backend PR detail projection keeps `/api/pr/:id` authoritative while allowing the frontend to render a clear private placeholder from one response field.

## Guardrails Touched

- Product truth: PR meeting-point guidance changes from a public auxiliary fact to status-sensitive participant-visible guidance.
- Backend authority: `GET /api/pr/:id` owns PR detail projection and viewer-scoped visibility.
- Frontend: PR detail facts card renders the backend-provided visibility state.
- Explicit boundary: public POI API `meetingPoint` remains unchanged for this slice.

## Verification

- Passed: `pnpm --filter @partner-up-dev/backend typecheck`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Initial direct backend package scenario command was blocked by missing scenario database env vars.
- Passed through the required root runner: `pnpm test:scenario backend`
