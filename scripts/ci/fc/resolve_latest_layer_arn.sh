#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  ALIYUN_FC_REGION
  ALIYUN_FC_NODE_MODULES_LAYER_NAME
  ALIBABA_CLOUD_ACCOUNT_ID
  GITHUB_OUTPUT
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: ${var_name}" >&2
    exit 1
  fi
done

raw_arn="$(python3 scripts/fc_layer_latest_arn.py \
  --region "$ALIYUN_FC_REGION" \
  --layer-name "$ALIYUN_FC_NODE_MODULES_LAYER_NAME" \
  --access default)"

normalized_arn="$(python3 scripts/fc_normalize_layer_arn.py \
  --raw-arn "$raw_arn" \
  --account-id "$ALIBABA_CLOUD_ACCOUNT_ID")"

echo "layer_arn=${normalized_arn}" >> "$GITHUB_OUTPUT"
