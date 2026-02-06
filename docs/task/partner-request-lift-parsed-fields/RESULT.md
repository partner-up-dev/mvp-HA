# Result

## Summary
1. Replaced nested `parsed` fields with top-level PartnerRequest fields (`type`, `time` window tuple, `partners` tuple) across backend entities, services, controllers, and frontend UI/validation/mocks.
2. Updated share/LLM flows to map PartnerRequest records into `PartnerRequestFields` and render prompts using top-level fields.
3. Added a dev reset migration for `partner_requests` and refreshed AGENTS docs to reflect the new field model.

## Tests
- Not run (not requested).
