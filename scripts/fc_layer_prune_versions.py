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


def _remove_version(region: str, layer_name: str, version_id: int, access: str) -> None:
    cmd = [
        "s",
        "cli",
        "fc3",
        "layer",
        "remove",
        "--region",
        region,
        "--layer-name",
        layer_name,
        "--version-id",
        str(version_id),
        "-y",
        "-a",
        access,
    ]
    subprocess.check_call(cmd)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Delete old FC layer versions via Serverless Devs, keeping the newest N.",
    )
    parser.add_argument("--region", required=True)
    parser.add_argument("--layer-name", required=True)
    parser.add_argument("--access", default="default")
    parser.add_argument("--keep", type=int, default=3)
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

    if args.keep < 1:
        print("--keep must be >= 1", file=sys.stderr)
        return 2

    if args.json_file:
        raw = open(args.json_file, "r", encoding="utf-8").read()
    else:
        raw = args.json_payload or _fetch_versions_json(args.region, args.layer_name, args.access)
    data = _load_json_payload(raw)

    items: list[dict[str, Any]] = []
    _walk_layer_items(data, items)

    versions = sorted(
        {v for v in (_to_int(it.get("version")) for it in items) if v >= 0},
        reverse=True,
    )

    if len(versions) <= args.keep:
        print(f"Layer versions: {versions} (<= {args.keep}), nothing to delete.")
        return 0

    to_delete = versions[args.keep :]
    print(f"Keeping versions: {versions[: args.keep]}; deleting: {to_delete}")

    for version_id in to_delete:
        print(f"Removing layer version: {version_id}")
        _remove_version(args.region, args.layer_name, version_id, args.access)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
