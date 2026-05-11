#!/usr/bin/env bash
set -euo pipefail

ci_fc_is_true() {
  case "${1:-}" in
    true | TRUE | 1 | yes | YES) return 0 ;;
    *) return 1 ;;
  esac
}

ci_fc_dry_run() {
  ci_fc_is_true "${CI_FC_DRY_RUN:-false}"
}

ci_fc_run() {
  echo "+ $*"
  if ci_fc_dry_run; then
    return 0
  fi

  "$@"
}

ci_fc_require_env() {
  local missing=0

  for var_name in "$@"; do
    if [ -z "${!var_name:-}" ]; then
      echo "Missing required env var: ${var_name}" >&2
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    exit 1
  fi
}

ci_fc_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

ci_fc_cd_repo_root() {
  cd "$(ci_fc_repo_root)"
}

ci_fc_install_serverless_devs() {
  local package_name="${SERVERLESS_DEVS_PACKAGE:-@serverless-devs/s@3.1.10}"
  ci_fc_run npm install -g "$package_name"
}

ci_fc_is_master_ref() {
  [ "${GITHUB_REF_NAME:-}" = "master" ]
}
