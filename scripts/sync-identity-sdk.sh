#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${IDENTITY_SDK_PATH:-$ROOT/../admin-dashboard/sdk}"
DEST="$ROOT/packages/identity-sdk"

if [[ ! -f "$SRC/package.json" || ! -d "$SRC/src" ]]; then
  echo "identity-sdk source not found at: $SRC" >&2
  echo "Clone admin-dashboard as a sibling, or set IDENTITY_SDK_PATH." >&2
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST/src" "$DEST/package.json" "$DEST/tsconfig.json"
mkdir -p "$DEST/src"
cp "$SRC/package.json" "$SRC/tsconfig.json" "$DEST/"
# Runtime sources only — skip unit tests and tooling configs.
find "$SRC/src" -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' ! -name '*.test.tsx' \
  -exec cp {} "$DEST/src/" \;

if command -v node >/dev/null 2>&1; then
  node <<EOF
const fs = require("fs");
const p = "$DEST/package.json";
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
delete pkg.scripts;
delete pkg.devDependencies;
pkg.description =
  "Vendored from admin-dashboard/sdk. Run npm run sync:identity-sdk to refresh.";
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
EOF
fi

echo "Synced identity-sdk ← $SRC"
echo "  → $DEST"
