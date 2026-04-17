# Release Automation Changelog

## Objective & Hypothesis

Introduce automated changelog/version/GitHub Release management for the pnpm
workspace while keeping backend and frontend release semantics separate.

Hypothesis:

- Release Please manifest mode fits the repo because backend and frontend are
  independent releasable app units with existing `package.json` versions.
- Backend GitHub Releases should be created only after production deploy
  succeeds.
- Frontend GitHub Releases can remain source releases because frontend
  deployment is currently pull-based and GitHub CI cannot observe deployment
  success.

## Guardrails Touched

- Root `AGENTS.md` commit/release policy for AI Coding.
- `docs/40-deployment/*` rollout/runtime truth.
- GitHub Actions release and backend production deploy workflows.
- `apps/backend/package.json` and `apps/frontend/package.json` version baselines.

## Verification

- `node -e` JSON parse passed for Release Please configs, manifest, and both
  app `package.json` files.
- `npx --yes ajv-cli@5.0.0 validate --strict=false --validate-formats=false`
  passed against the Release Please config schema.
- `npx --yes prettier@3.5.3 --check` passed for the edited workflow YAML files.
- `node -e` version consistency check confirmed both app package versions match
  `.release-please-manifest.json` at `0.3.0`.
- `pnpm install --lockfile-only --frozen-lockfile` passed with no dependency
  changes required.
- `git status --short` still shows the pre-existing unrelated
  `tasks/domain-structure-code-doc-review/` directory; it was not touched.
