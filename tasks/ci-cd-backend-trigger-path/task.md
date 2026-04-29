# Backend Deploy Trigger Path Alignment

## Objective & Hypothesis

Align the backend deploy workflow trigger paths with repository-level inputs
used by backend install, build, and layer packaging.

Hypothesis: adding root workspace/toolchain inputs to the workflow trigger, and
including workspace package inputs in layer-change detection, prevents backend
deploys from being skipped when CI/CD inputs change outside `apps/backend/**`.

## Guardrails Touched

- Backend deploy workflow: `.github/workflows/backend-fc-deploy.yml`
- Backend deploy script layer detection: `scripts/ci/fc/deploy_backend.sh`
- Deployment docs: `docs/40-deployment/rollout.md`

## Verification

- Static review of trigger paths against install/build/layer inputs.
- Shell syntax check for backend deploy script.
- Backend deploy dry-run with a root package diff to verify layer publication path.

## Verification Results

- `bash -n scripts/ci/fc/deploy_backend.sh` passed.
- `git diff --check` passed.
- Static search confirms backend deploy paths include `.node-version`,
  `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- Backend deploy dry-run over a push range containing root package/toolchain
  changes expanded migration, layer publication, and backend deploy steps.
