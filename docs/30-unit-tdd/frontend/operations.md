# Frontend Operations

## Local Development

- `pnpm --filter @partner-up-dev/frontend dev`
- `pnpm --filter @partner-up-dev/frontend build`
- optional token governance checks through `lint:tokens` commands

## App Startup

- `src/main.ts` loads global styles and mounts `createPartnerUpApp()`
- `createPartnerUpApp()` wires Vue Query, Pinia, head management, i18n, and router
- auth session bootstrap runs on mount and may initialize anonymous/local/authenticated continuity

## Runtime Notes

- route metadata influences share behavior and admin auth redirects
- WeChat-specific flows may redirect through OAuth and later resume pending browser actions
- frontend must preserve `credentials: "include"` on cookie-dependent backend calls
