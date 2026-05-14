# Me Page Logout

## Objective & Hypothesis

Add a `/me` logout action that clears the current browser user session and immediately establishes a fresh anonymous session, so the visible user id changes without requiring a reload.

## Guardrails Touched

- Frontend session restoration and localStorage-backed user identity.
- `/me` personal-center profile surface.
- Product revisit workflow description for `/me`.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- Logout clears the previous in-memory/browser user session through the session store, requests a fresh anonymous session, and removes the stale current-user profile query.
