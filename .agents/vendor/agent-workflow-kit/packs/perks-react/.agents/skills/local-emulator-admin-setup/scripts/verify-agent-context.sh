#!/bin/bash
set -euo pipefail

CTX_PATH="e2e/.agent/local-testing-context.json"
AUTH_BASE="http://localhost:9099"
FIRESTORE_BASE="http://localhost:8080"

if [ ! -f "$CTX_PATH" ]; then
  echo "Context file missing: $CTX_PATH"
  exit 1
fi

eval "$(node <<'NODE'
const fs = require('fs')
const ctx = JSON.parse(fs.readFileSync('e2e/.agent/local-testing-context.json', 'utf8'))
const firstCard = ctx.seededCards && ctx.seededCards[0] ? ctx.seededCards[0].cardId : ''
const q = (v) => JSON.stringify(String(v ?? ''))
console.log(`PROJECT_ID=${q(ctx.projectId || 'perks-react')}`)
console.log(`ADMIN_EMAIL=${q(ctx.admin?.email || '')}`)
console.log(`ADMIN_PASSWORD=${q(ctx.admin?.password || '')}`)
console.log(`ADMIN_UID=${q(ctx.admin?.uid || '')}`)
console.log(`FIRST_CARD_ID=${q(firstCard)}`)
NODE
)"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ] || [ -z "$ADMIN_UID" ]; then
  echo "Invalid context file: missing admin credentials or uid"
  exit 1
fi

SIGNIN_JSON=$(curl -s -X POST "${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"returnSecureToken\":true}")

LOGIN_UID=$(echo "$SIGNIN_JSON" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(d.localId||'')")
if [ "$LOGIN_UID" != "$ADMIN_UID" ]; then
  echo "Auth verification failed. Expected uid=$ADMIN_UID, got uid=${LOGIN_UID:-<none>}"
  echo "$SIGNIN_JSON"
  exit 1
fi

USER_DOC=$(curl -s -H 'Authorization: Bearer owner' \
  "${FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${ADMIN_UID}")

EMAIL_VERIFIED=$(echo "$USER_DOC" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(String(d.fields?.emailVerified?.booleanValue))")
ROLE=$(echo "$USER_DOC" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(d.fields?.role?.stringValue||'')")

if [ "$EMAIL_VERIFIED" != "true" ] || [ "$ROLE" != "admin" ]; then
  echo "Firestore user verification failed. emailVerified=$EMAIL_VERIFIED role=$ROLE"
  exit 1
fi

if [ -n "$FIRST_CARD_ID" ]; then
  CARD_DOC=$(curl -s -H 'Authorization: Bearer owner' \
    "${FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/cards/${FIRST_CARD_ID}")
  CARD_NAME=$(echo "$CARD_DOC" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(d.fields?.displayName?.stringValue||'')")
  if [ -z "$CARD_NAME" ]; then
    echo "Card verification failed for ${FIRST_CARD_ID}"
    exit 1
  fi
fi

echo "Verification passed"
echo "- Admin email: $ADMIN_EMAIL"
echo "- Admin uid: $ADMIN_UID"
echo "- First card id: ${FIRST_CARD_ID:-<none>}"
