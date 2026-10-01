#!/usr/bin/env bash
# Build the whole TraceBook web surface into ./site for Cloudflare Pages.
#
#   landing/        ->  site/            (marketing page)
#   app/ (Expo web) ->  site/app/        (installable PWA)
#
# Everything is emitted with relative paths so site/ can be served from the
# domain root or any sub-path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Exporting Expo web bundle"
rm -rf app/dist site
( cd app && npx expo export --platform web --output-dir dist )

echo "==> Building PWA (icons, manifest, service worker)"
python3 app/scripts/build_pwa.py app/dist --base /app/ --shots landing

echo "==> Assembling site/"
mkdir -p site
cp landing/index.html landing/*.png landing/_headers site/
cp -r app/dist site/app

echo "==> Done"
du -sh site
