# L1 Plan (High-Level Solution)

## Discovery Summary
- Backend `PRStatus` is defined in `apps/backend/src/entities/partner-request.ts` as `OPEN | ACTIVE | CLOSED` and enforced by zod schemas and DB type.
- DB table `partner_requests` has no expiry or time window columns; only `created_at` exists.
- No scheduler/cron exists in the backend; server is a long-running Node process (`apps/backend/src/index.ts`).
- Frontend uses `PRStatus` union and hard-coded status maps/options in `StatusBadge.vue`, `ModifyStatusModal.vue`, `useUpdatePRStatus.ts`, plus mock RPC.
- Product docs already define `EXPIRED`, and key decisions state "时间到自动结束".

## High-Level Design (Updated)
- Add an explicit expiry timestamp (`expires_at`) to PartnerRequest.
- LLM parsing must produce an ISO 8601 datetime string for expiry (scenario-specific duration/interpretation).
- Expiration is checked lazily **on fetch only**: when a PR is retrieved, if `expires_at <= now` and status is `OPEN` or `ACTIVE`, auto-update to `EXPIRED` before returning.
- Manual status update API must **not** accept `EXPIRED`.

## Decisions from User
- Default TTL varies by scenario and is determined by the LLM.
- Expiry source is the LLM: provide current datetime and require ISO 8601 in the parsed output.
- Manual status update must not allow `EXPIRED`.
- Expiration check is lazy and only on fetch.

## Open Questions
- None.
