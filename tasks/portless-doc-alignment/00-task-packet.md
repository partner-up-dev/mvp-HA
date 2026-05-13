# Portless Doc Alignment

## Objective & Hypothesis

Align durable development and environment documentation with the existing portless setup.

Hypothesis: the repository already supports portless through `portless.json`, root scripts, and frontend Vite configuration, while durable docs and env examples still present fixed local ports as the primary developer workflow.

## Guardrails Touched

- Input classification: `Constraint`, because the technical development environment boundary changed while product behavior stays the same.
- Durable owners:
  - `AGENTS.md` for repository operating guidance.
  - `docs/20-product-tdd/cross-unit-contracts.md` for frontend/backend local origin coordination.
  - `docs/40-deployment/environments.md` for runtime and local environment truth.
  - package `.env.example` files for executable local configuration examples.
- Invariants:
  - production backend FC runtime facts remain deployment-owned.
  - scenario tests keep isolated runner-owned ports.
  - fixed-port local fallback remains available for explicit compatibility needs.

## Verification

- Search durable docs and env examples for `portless`, `4001`, `4002`, `3000`, `PORTLESS_URL`, and local server language.
- Confirm remaining fixed port references are framed as fallback, scenario isolation, database URLs, or production runtime defaults.

Verified:

- `rg` sweep shows `4001` / `4002` only in fixed-port fallback guidance and env examples.
- `3000` remains in deployment docs as the production FC listener default.
- Scenario test references remain runner-owned isolated HTTP server language.
- `git diff --check` passes.
