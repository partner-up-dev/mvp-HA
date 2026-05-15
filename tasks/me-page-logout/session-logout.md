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

## 2026-05-15 Logout Profile Reset Follow-up

### Objective & Hypothesis

Fix the observed `/me` logout state mismatch where localStorage moves to a fresh anonymous session while the page can still render the previous authenticated profile from Vue Query observer data.

### Guardrails Touched

- `/me` profile surface rendering.
- Frontend auth session store role semantics.
- Current user profile query cache cleanup.

### Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- Scope excludes adding new frontend tests by request.
