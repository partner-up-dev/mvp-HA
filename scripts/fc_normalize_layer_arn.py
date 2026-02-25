#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys

LAYER_ARN_PATTERN = re.compile(r"^(acs:fc:[a-z0-9-]+:)([^:]+)(:layers/.+/versions/.+)$")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize FC layer ARN account segment with a concrete Alibaba Cloud account id.",
    )
    parser.add_argument("--raw-arn", required=True)
    parser.add_argument("--account-id", required=True)
    args = parser.parse_args()

    raw_arn = args.raw_arn.strip()
    account_id = args.account_id.strip()

    match = LAYER_ARN_PATTERN.match(raw_arn)
    if not match:
        print(f"Invalid layer ARN: {raw_arn}", file=sys.stderr)
        return 1

    if not account_id.isdigit():
        print("Invalid --account-id; expected digits.", file=sys.stderr)
        return 1

    print(f"{match.group(1)}{account_id}{match.group(3)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
