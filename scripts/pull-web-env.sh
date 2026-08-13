#!/usr/bin/env bash
# Write rn/.env.<stage> from SSM for Arcades (stacks SnakeWeb-prod / SnakeWeb-staging).
# Usage: scripts/pull-web-env.sh [prod|staging|all]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

getp() {
  aws ssm get-parameter --name "$1" --query Parameter.Value --output text
}

getp_arcades() {
  local stage="$1" key="$2"
  getp "/arcades/$stage/$key" 2>/dev/null || getp "/snake/$stage/$key"
}

write_stage() {
  local stage="$1"
  local out="$ROOT/rn/.env.$stage"
  local scores client bucket dist domain
  scores="$(getp_arcades "$stage" scores-api-url)"
  client="$(getp_arcades "$stage" cognito-client-id)"
  bucket="$(getp_arcades "$stage" web-bucket)"
  dist="$(getp_arcades "$stage" cf-distribution-id)"
  domain="$(getp /account/cognito-domain 2>/dev/null || getp /identity/cognito-domain)"

  cat >"$out" <<EOF
EXPO_PUBLIC_IDENTITY_CLIENT_ID=$client
EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN=$domain
EXPO_PUBLIC_SCORES_API_URL=$scores
ARCADES_WEB_BUCKET=$bucket
ARCADES_CF_DISTRIBUTION_ID=$dist
EOF
  echo "Wrote $out"
}

case "$TARGET" in
  prod|staging) write_stage "$TARGET" ;;
  all)
    write_stage prod
    write_stage staging
    ;;
  *)
    echo "usage: $0 [prod|staging|all]" >&2
    exit 1
    ;;
esac
