#!/usr/bin/env bash
# Export Expo web and upload to the stage's S3 + CloudFront target.
# Usage:
#   npm run deploy:web                 # uses already-exported shell env
#   npm run deploy:web:staging         # loads rn/.env.staging
#   scripts/deploy-web.sh production   # loads rn/.env.production
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${1:-}"

load_env_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "env file not found: $file" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

if [[ -n "$STAGE" ]]; then
  if [[ ! "$STAGE" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "invalid stage name: $STAGE (use [a-z][a-z0-9-]*)" >&2
    exit 1
  fi
  load_env_file "$ROOT/rn/.env.$STAGE"
  echo "deploy stage: $STAGE (from rn/.env.$STAGE)"
fi

if [[ -z "${SNAKE_WEB_BUCKET:-}" || -z "${SNAKE_CF_DISTRIBUTION_ID:-}" ]]; then
  echo "set SNAKE_WEB_BUCKET and SNAKE_CF_DISTRIBUTION_ID (or pass a stage with those in rn/.env.<stage>)" >&2
  exit 1
fi

if [[ -z "${EXPO_PUBLIC_IDENTITY_CLIENT_ID:-}" || -z "${EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN:-}" ]]; then
  echo "warning: EXPO_PUBLIC_IDENTITY_CLIENT_ID / EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN unset — Sign In will be disabled in this build" >&2
fi

cd "$ROOT/rn"
npx expo export -p web

cd "$ROOT/cmd/deploy-web"
export SNAKE_WEB_DIST="${SNAKE_WEB_DIST:-$ROOT/rn/dist}"
go run .
