#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


def _walk_layer_items(value: Any, items: list[dict[str, Any]]) -> None:
    if isinstance(value, list):
        for child in value:
            _walk_layer_items(child, items)
        return

    if isinstance(value, dict):
        if "version" in value and ("layerVersionArn" in value or "arn" in value):
            items.append(value)
        for child in value.values():
            _walk_layer_items(child, items)


def _to_int(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except Exception:
        return -1


def _load_json_payload(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("Failed to parse JSON payload:", file=sys.stderr)
        print(raw, file=sys.stderr)
        raise


def _fetch_versions_json(region: str, layer_name: str, access: str) -> str:
    cmd = [
        "s",
        "cli",
        "fc3",
        "layer",
        "versions",
        "--region",
        region,
        "--layer-name",
        layer_name,
        "-o",
        "json",
        "-a",
        access,
    ]
    return subprocess.check_output(cmd, text=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resolve the latest (highest version) FC layer ARN via Serverless Devs.",
    )
    parser.add_argument("--region", required=True)
    parser.add_argument("--layer-name", required=True)
    parser.add_argument("--access", default="default")
    parser.add_argument(
        "--json-file",
        dest="json_file",
        help="Optional: path to JSON output from `s cli fc3 layer versions -o json` (for testing).",
    )
    parser.add_argument(
        "--json",
        dest="json_payload",
        help="Optional: JSON payload from `s cli fc3 layer versions -o json` (for testing).",
    )
    args = parser.parse_args()

    if args.json_file:
        raw = open(args.json_file, "r", encoding="utf-8").read()
    else:
        raw = args.json_payload or _fetch_versions_json(args.region, args.layer_name, args.access)
    data = _load_json_payload(raw)

    items: list[dict[str, Any]] = []
    _walk_layer_items(data, items)

    best_item: dict[str, Any] | None = None
    best_version = -1
    for item in items:
        version = _to_int(item.get("version"))
        if version > best_version:
            best_version = version
            best_item = item

    if not best_item:
        print("No layer versions found in output", file=sys.stderr)
        return 1

    arn = best_item.get("layerVersionArn") or best_item.get("arn")
    if not isinstance(arn, str) or not arn:
        print("Latest layer item did not include an ARN field", file=sys.stderr)
        return 1

    print(arn)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
