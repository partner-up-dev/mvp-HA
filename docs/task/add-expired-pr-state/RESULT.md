# Result

## Summary
- Added `EXPIRED` PR status and `expiresAt` (ISO 8601) to parsed partner request data, with LLM prompt enforcing the field and current time context.
- Implemented lazy expiration on fetch: `OPEN/ACTIVE` requests auto-transition to `EXPIRED` when `expiresAt` is reached.
- Updated frontend status display, manual status typing, and edit flow to carry `expiresAt` through content updates; fixed mock RPC data accordingly.
- Added DB migration for `expires_at` and updated docs/AGENTS to reflect the new state behavior.

## Tests
- Not run (not requested).
