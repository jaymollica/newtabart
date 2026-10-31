#!/usr/bin/env bash
# Build the distributable extension package.
#
# Produces:
#   dist/unpacked/                      the exact files that ship
#   dist/new-tab-new-art-<version>.zip  the same files, zipped for both stores
#
# The file list is explicit so stray files (store assets, scratch work,
# old zips) never end up in a release. Add new shipped files here.

set -euo pipefail

cd "$(dirname "$0")/.."

SHIPPED_FILES=(
    manifest.json
    background.js
    browser-polyfill.js
    jquery-3.4.1.js
    newpage.html
    getart.js
    style.css
    options.html
    options.js
    favorites.html
    favorites.js
    history.html
    history.js
    pages.css
    pages-common.js
    icon16.png
    icon48.png
    icon128.png
)

VERSION=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
NAME="new-tab-new-art-${VERSION}"

rm -rf dist
mkdir -p dist/unpacked

for f in "${SHIPPED_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "error: shipped file missing: $f" >&2
        exit 1
    fi
    cp "$f" dist/unpacked/
done

# Sanity check: every local file referenced from HTML/manifest must ship.
missing=0
for ref in $(grep -ohE '(src|href)="[^"#:]+"' dist/unpacked/*.html | sed -E 's/^(src|href)="//; s/"$//' | sort -u); do
    if [[ ! -f "dist/unpacked/$ref" ]]; then
        echo "error: $ref is referenced from HTML but not in SHIPPED_FILES" >&2
        missing=1
    fi
done
[[ $missing -eq 0 ]] || exit 1

( cd dist/unpacked && zip -q -X -r "../${NAME}.zip" . -x '.*' )

echo "built dist/${NAME}.zip"
unzip -Z1 "dist/${NAME}.zip" | sed 's/^/  /'
