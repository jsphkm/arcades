#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/api"

mkdir -p dist
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o dist/bootstrap .
echo "Wrote $ROOT/api/dist/bootstrap"
