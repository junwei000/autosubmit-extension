#!/usr/bin/env bash
# Builds dist/autosubmit-v<version>.zip with manifest.json at the zip root
# (loadable via "Load unpacked" after unzipping, and accepted by the Chrome Web Store).
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out="dist/autosubmit-v${version}.zip"

# Sanity checks: valid manifest, every referenced file exists, scripts parse.
node -e '
  const fs = require("fs");
  const m = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  const files = [
    ...Object.values(m.icons || {}),
    ...Object.values((m.action || {}).default_icon || {}),
    m.background && m.background.service_worker,
    m.options_page,
    ...(m.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
    ...(m.web_accessible_resources || []).flatMap((w) => w.resources)
  ].filter(Boolean);
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) { console.error("Missing files referenced by manifest:", missing); process.exit(1); }
'
for f in src/*.js; do node --check "$f"; done

rm -rf dist && mkdir -p dist
zip -qr "$out" manifest.json src icons LICENSE README.md -x '*.DS_Store'
echo "$out"
