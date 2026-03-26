# Deployment-Shaping Constraints

## Scale-To-Zero Backend

- backend runs on Aliyun FC custom runtime
- long-lived in-process schedulers are not reliable as the primary execution model
- delayed work must be modeled through DB-backed jobs and externally triggerable ticks

## Type-Sharing Monorepo

- frontend and backend live in one workspace
- frontend compile-time contracts depend on backend exports
- contract evolution is easier inside one repo, but backend public type exports become system-shaping interfaces

## Forward-Only Data Evolution

- Drizzle SQL artifacts plus hand-authored data migrations are committed
- staging/production migrations are forward-only
- schema evolution must preserve deployability and rollback discipline through expand/backfill/contract thinking

## Environment-Sensitive User Flows

- WeChat OAuth, JS-SDK, and subscription capabilities differ by environment
- frontend URL, auth secrets, and config keys materially shape the available flows

These constraints belong in system design because they change how units are allowed to coordinate.
