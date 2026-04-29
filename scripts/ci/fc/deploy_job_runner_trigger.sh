#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

ci_fc_cd_repo_root

main() {
  ci_fc_require_env \
    ALIBABA_CLOUD_ACCESS_KEY_ID \
    ALIBABA_CLOUD_ACCESS_KEY_SECRET \
    ALIBABA_CLOUD_ACCOUNT_ID \
    ALIYUN_FC_REGION \
    ALIYUN_FC_FUNCTION_NAME \
    ALIYUN_FC_JOB_RUNNER_TRIGGER_FUNCTION_NAME \
    ALIYUN_FC_JOB_RUNNER_TICK_URL \
    ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON \
    ALIYUN_FC_ROLE_ARN \
    ALIYUN_FC_RESOURCE_GROUP_ID \
    JOB_RUNNER_INTERNAL_TOKEN

  ci_fc_install_serverless_devs
  ci_fc_run bash scripts/ci/fc/configure_aliyun_credentials.sh
  ci_fc_run s deploy -y -t apps/backend/fc-job-runner-trigger/s.yaml

  if ci_fc_is_master_ref; then
    ci_fc_run bash scripts/ci/fc/publish_function_version.sh
    ci_fc_run bash scripts/ci/fc/publish_production_alias.sh
  fi
}

main "$@"
