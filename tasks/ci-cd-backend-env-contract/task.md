# Backend Deploy Env Contract

## Objective & Hypothesis

Make backend staging/production deployment fail fast when required runtime or
infrastructure environment variables are missing.

Hypothesis: moving the backend environment contract into a repository script
reduces drift between `env.ts`, FC runtime config, and GitHub Environment
settings while preserving existing runtime behavior.

## Guardrails Touched

- Backend runtime env schema: `apps/backend/src/lib/env.ts`
- FC runtime template: `apps/backend/s.yaml`
- Backend deploy workflow: `.github/workflows/backend-fc-deploy.yml`
- FC deploy scripts: `scripts/ci/fc/*`
- Deployment docs: `docs/40-deployment/environments.md`

## Verification

- Shell syntax check for touched FC scripts.
- Positive dry-run for layer-only deployment.
- Positive dry-run for standard backend deployment with dummy required values.
- Negative dry-run that omits `AUTH_JWT_SECRET` and fails before deploy.
- Backend typecheck.
- Static search for important backend env names across workflow/template/script.

## Verification Results

- `bash -n` passed for touched FC scripts.
- Layer-only dry-run passed and validated only the layer env contract.
- Standard backend dry-run passed migration and runtime env contracts before
  expanding deploy steps.
- Negative dry-run without `AUTH_JWT_SECRET` failed before Serverless Devs
  install, Aliyun credential configuration, migration, or runtime deploy.
- Backend `tsc --noEmit` passed.
- Runtime env parsing accepts empty optional env values as `undefined` and keeps
  defaults such as `LLM_DEFAULT_MODEL`.
