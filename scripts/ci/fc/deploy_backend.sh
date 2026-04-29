#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

ci_fc_cd_repo_root

workspace_dependencies_installed=false

install_workspace_dependencies() {
  if [ "$workspace_dependencies_installed" = "true" ]; then
    return 0
  fi

  ci_fc_run pnpm install --frozen-lockfile
  workspace_dependencies_installed=true
}

path_is_layer_input() {
  case "$1" in
    apps/backend/package.json | pnpm-lock.yaml | apps/backend/layers/node-modules/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

git_commit_exists() {
  git cat-file -e "$1^{commit}" 2>/dev/null
}

should_publish_layer() {
  if ci_fc_is_true "${PUBLISH_LAYER_ONLY:-false}" || ci_fc_is_true "${FORCE_PUBLISH_LAYER:-false}"; then
    return 0
  fi

  if [ "${GITHUB_EVENT_NAME:-}" != "push" ]; then
    return 1
  fi

  local before="${GITHUB_EVENT_BEFORE:-}"
  local after="${GITHUB_SHA:-HEAD}"

  if [ -z "$before" ] || [[ "$before" =~ ^0+$ ]]; then
    echo "Unable to compare push range; publishing backend layer."
    return 0
  fi

  if ! git_commit_exists "$before"; then
    echo "Push base commit is unavailable in checkout; publishing backend layer."
    return 0
  fi

  local changed_file
  while IFS= read -r changed_file; do
    if path_is_layer_input "$changed_file"; then
      return 0
    fi
  done < <(git diff --name-only "$before" "$after" -- apps/backend/package.json pnpm-lock.yaml apps/backend/layers/node-modules)

  return 1
}

run_backend_migrations() {
  ci_fc_require_env DATABASE_URL_FOR_MIGRATION

  install_workspace_dependencies
  ci_fc_run pnpm --filter @partner-up-dev/backend db:lint
  ci_fc_run pnpm --filter @partner-up-dev/backend build:db-migrate-fc
  ci_fc_run bash scripts/ci/fc/prepare_fc_db_migrate_package.sh

  echo "+ DATABASE_URL=<redacted> s deploy -y -t apps/backend/fc-db-migrate/s.yaml"
  if ! ci_fc_dry_run; then
    DATABASE_URL="$DATABASE_URL_FOR_MIGRATION" s deploy -y -t apps/backend/fc-db-migrate/s.yaml
  fi

  echo '+ DATABASE_URL=<redacted> s invoke -t apps/backend/fc-db-migrate/s.yaml -e "{}"'
  if ! ci_fc_dry_run; then
    DATABASE_URL="$DATABASE_URL_FOR_MIGRATION" s invoke -t apps/backend/fc-db-migrate/s.yaml -e "{}"
  fi
}

publish_backend_layer() {
  install_workspace_dependencies
  ci_fc_run bash scripts/ci/fc/prepare_node_modules_layer.sh
  ci_fc_run bash scripts/ci/fc/publish_node_modules_layer.sh
  ci_fc_run python3 scripts/fc_layer_prune_versions.py \
    --region "$ALIYUN_FC_REGION" \
    --layer-name "$ALIYUN_FC_NODE_MODULES_LAYER_NAME" \
    --keep 3 \
    --access default
}

resolve_backend_layer_arn() {
  if ci_fc_dry_run; then
    echo "dry-run-layer-arn"
    return 0
  fi

  bash scripts/ci/fc/resolve_latest_layer_arn.sh
}

deploy_backend_function() {
  ci_fc_require_env DATABASE_URL

  local layer_arn
  layer_arn="$(resolve_backend_layer_arn)"
  export ALIYUN_FC_NODE_MODULES_LAYER_ARN="$layer_arn"

  install_workspace_dependencies
  ci_fc_run pnpm --filter @partner-up-dev/backend build
  ci_fc_run chmod +x apps/backend/fc-start.sh
  ci_fc_run bash scripts/ci/fc/prepare_fc_package.sh
  ci_fc_run s deploy -y -t apps/backend/s.yaml

  if ci_fc_is_master_ref; then
    ci_fc_run bash scripts/ci/fc/publish_function_version.sh
    ci_fc_run bash scripts/ci/fc/publish_production_alias.sh
  fi
}

main() {
  ci_fc_require_env \
    ALIBABA_CLOUD_ACCESS_KEY_ID \
    ALIBABA_CLOUD_ACCESS_KEY_SECRET \
    ALIBABA_CLOUD_ACCOUNT_ID \
    ALIYUN_FC_REGION \
    ALIYUN_FC_NODE_MODULES_LAYER_NAME

  ci_fc_install_serverless_devs
  ci_fc_run bash scripts/ci/fc/configure_aliyun_credentials.sh

  if ci_fc_is_true "${PUBLISH_LAYER_ONLY:-false}"; then
    publish_backend_layer
    exit 0
  fi

  run_backend_migrations

  if should_publish_layer; then
    publish_backend_layer
  fi

  deploy_backend_function
}

main "$@"
