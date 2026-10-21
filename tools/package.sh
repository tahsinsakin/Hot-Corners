#!/usr/bin/env bash
# Builds the zip to upload to the Chrome Web Store: dist/hot-corners-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
mkdir -p dist
out="dist/hot-corners-$version.zip"
rm -f "$out"
(cd extension && zip -qrX "../$out" . -x '.*')
echo "$out"
