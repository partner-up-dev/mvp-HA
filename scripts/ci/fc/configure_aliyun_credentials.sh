#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  ALIBABA_CLOUD_ACCESS_KEY_ID
  ALIBABA_CLOUD_ACCESS_KEY_SECRET
  ALIBABA_CLOUD_ACCOUNT_ID
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: ${var_name}" >&2
    exit 1
  fi
done

s config add -a default -f \
  --AccessKeyID "$ALIBABA_CLOUD_ACCESS_KEY_ID" \
  --AccessKeySecret "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" \
  --AccountID "$ALIBABA_CLOUD_ACCOUNT_ID"
