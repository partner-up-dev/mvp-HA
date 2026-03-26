# Frontend Unit

## Role

The frontend unit realizes PartnerUp MVP-HA as a browser-based H5 application.

It assembles routes, pages, and domain UI; consumes typed backend contracts; and manages browser-specific continuity and environment-aware UX.

## Owns

- Vue app bootstrap and router wiring
- page entrypoints and domain-first UI composition
- browser-side auth/session bootstrap
- typed RPC consumption and cache invalidation
- browser storage for session continuity, analytics attribution, and pending WeChat actions
- fallback UX for browser/platform capability differences

## Depends On

- backend HTTP API and exported compile-time types
- browser APIs, Vue ecosystem libraries, and WeChat web environment behavior

## Does Not Own

- authoritative PR/user/event state
- domain eligibility logic or final transition semantics
