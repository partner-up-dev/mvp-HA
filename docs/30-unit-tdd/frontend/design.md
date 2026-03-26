# Frontend Design

## Internal Shape

The frontend is domain-first:

- `app/*` for app wiring
- `processes/*` for cross-domain/browser workflows
- `domains/*` for business-owned UI, queries, use cases, and model code
- `shared/*` for cross-domain primitives and infrastructure
- `pages/*` for route entrypoints only

## Design Rules

- pages assemble; they do not become the owner of reusable domain logic
- frontend queries and use cases should consume backend contracts through Hono RPC, not ad hoc fetch wrappers
- backend-derived temporal or policy-heavy state should stay server-derived when possible
- shared UI must remain domain-agnostic

## Main Local Workflow Layers

- auth bootstrap on app mount
- route-level WeChat auto-login and pending action resumption
- TanStack Query for server-state caching
- domain-owned view composition for PR/event/share/admin/support/user flows
