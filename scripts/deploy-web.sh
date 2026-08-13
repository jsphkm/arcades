#!/usr/bin/env bash
# Export Expo web and upload to the matching staged stack.
# Stack ids stay SnakeWeb-* so S3/CloudFront are not replaced; product SSM is under /arcades.
# Deploy targets (bucket, CloudFront, scores API) always come from SSM for the stage so
# local env cannot point at a leftover unstaged stack.
#
# Usage:
#   scripts/deploy-web.sh prod
#   scripts/deploy-web.sh staging
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${1:-}"

load_env_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  set -a
  source "$file"
  set +a
  return 0
}

ssm_get() {
  aws ssm get-parameter --name "$1" --query Parameter.Value --output text 2>/dev/null
}

if [[ -z "$STAGE" ]]; then
  echo "usage: $0 <prod|staging>" >&2
  exit 1
fi

if [[ "$STAGE" == "production" ]]; then
  echo "use stage 'prod' (stack SnakeWeb-prod), not 'production'" >&2
  exit 1
fi

if [[ "$STAGE" != "prod" && "$STAGE" != "staging" ]]; then
  echo "stage must be 'prod' or 'staging' (got: $STAGE)" >&2
  exit 1
fi

# Optional local overrides for auth client / cognito domain only.
if load_env_file "$ROOT/rn/.env.$STAGE"; then
  echo "loaded local rn/.env.$STAGE (auth vars); deploy targets from SSM"
else
  echo "no rn/.env.$STAGE — using SSM + shell env for auth vars"
fi

BUCKET="$(ssm_get "/arcades/$STAGE/web-bucket" || ssm_get "/snake/$STAGE/web-bucket" || true)"
DIST_ID="$(ssm_get "/arcades/$STAGE/cf-distribution-id" || ssm_get "/snake/$STAGE/cf-distribution-id" || true)"
SCORES_URL="$(ssm_get "/arcades/$STAGE/scores-api-url" || ssm_get "/snake/$STAGE/scores-api-url" || true)"
CLIENT_ID="$(ssm_get "/arcades/$STAGE/cognito-client-id" || ssm_get "/snake/$STAGE/cognito-client-id" || true)"

if [[ -z "$BUCKET" || -z "$DIST_ID" || -z "$SCORES_URL" ]]; then
  echo "missing SSM deploy targets for stage '$STAGE'." >&2
  echo "expected: /arcades/$STAGE/web-bucket, cf-distribution-id, scores-api-url" >&2
  echo "deploy CDK stacks SnakeWeb-prod / SnakeWeb-staging first." >&2
  exit 1
fi

export ARCADES_WEB_BUCKET="$BUCKET"
export ARCADES_CF_DISTRIBUTION_ID="$DIST_ID"
export SNAKE_WEB_BUCKET="$BUCKET"
export SNAKE_CF_DISTRIBUTION_ID="$DIST_ID"
export EXPO_PUBLIC_SCORES_API_URL="$SCORES_URL"
if [[ -n "$CLIENT_ID" ]]; then
  export EXPO_PUBLIC_IDENTITY_CLIENT_ID="$CLIENT_ID"
fi

echo "deploy stage: $STAGE → s3://$ARCADES_WEB_BUCKET (cf $ARCADES_CF_DISTRIBUTION_ID)"
echo "scores API: $EXPO_PUBLIC_SCORES_API_URL"

if [[ -z "${EXPO_PUBLIC_IDENTITY_CLIENT_ID:-}" || -z "${EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN:-}" ]]; then
  echo "warning: EXPO_PUBLIC_IDENTITY_CLIENT_ID / EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN unset — Sign In will be disabled in this build" >&2
fi

cd "$ROOT/rn"
rm -rf dist node_modules/.cache
npx expo export -p web --clear

expected="$(echo "$EXPO_PUBLIC_SCORES_API_URL" | sed 's:/*$::')"
if ! rg -q -F "$expected" dist -g '*.js'; then
  echo "export missing expected scores API URL: $expected" >&2
  echo "URLs found in bundle:" >&2
  rg -o 'https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com' dist -g '*.js' | sort -u >&2 || true
  exit 1
fi
echo "verified scores API URL in bundle: $expected"

cd "$ROOT/cmd/deploy-web"
export ARCADES_WEB_DIST="${ARCADES_WEB_DIST:-$ROOT/rn/dist}"
export SNAKE_WEB_DIST="$ARCADES_WEB_DIST"
go run .
