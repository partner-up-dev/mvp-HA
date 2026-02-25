#!/usr/bin/env bash
set -euo pipefail

rm -rf apps/backend/.fc-package
mkdir -p apps/backend/.fc-package

cp -R apps/backend/dist apps/backend/.fc-package/
cp apps/backend/package.json apps/backend/fc-start.sh apps/backend/.fc-package/
