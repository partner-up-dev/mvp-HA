#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  ALIYUN_FC_REGION
  ALIYUN_FC_FUNCTION_NAME
  GITHUB_SHA
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: ${var_name}" >&2
    exit 1
  fi
done

s cli fc3 alias publish \
  --region "$ALIYUN_FC_REGION" \
  --function-name "$ALIYUN_FC_FUNCTION_NAME" \
  --alias-name "production" \
  --version-id "latest" \
  --description "$GITHUB_SHA" \
  -a default
