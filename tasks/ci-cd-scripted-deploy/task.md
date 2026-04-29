# CI/CD Scripted Deploy

## Objective & Hypothesis

Move deployment control flow out of GitHub Actions YAML and into repository
scripts so the deploy path is easier to inspect, reuse, and dry-run locally.

Hypothesis: keeping Actions as runner setup plus script invocation preserves the
current rollout behavior while reducing CI/CD logic spread across YAML steps.

## Guardrails Touched

- Deployment owner: `docs/40-deployment/rollout.md`
- Backend FC workflow: `.github/workflows/backend-fc-deploy.yml`
- Job runner trigger workflow: `.github/workflows/job-runner-trigger-fc-deploy.yml`
- FC deploy scripts: `scripts/ci/fc/*`

## Verification

- Shell syntax check for all touched deploy scripts.
- Dry-run backend standard and layer-only script paths without touching Aliyun.
- Dry-run job-runner trigger script path without touching Aliyun.
- Static review of workflow step reduction against the prior rollout sequence.

## Verification Results

- `bash -n` passed for touched FC shell scripts.
- `CI_FC_DRY_RUN=true` backend standard path expanded migration, package, deploy steps.
- `CI_FC_DRY_RUN=true PUBLISH_LAYER_ONLY=true` backend path expanded only layer publish steps.
- `CI_FC_DRY_RUN=true FORCE_PUBLISH_LAYER=true GITHUB_REF_NAME=master` backend path expanded migration, layer, deploy, version, and alias steps.
- `CI_FC_DRY_RUN=true GITHUB_REF_NAME=master` job-runner path expanded deploy, version, and alias steps.
