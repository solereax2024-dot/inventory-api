#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:8080}"
DB_CONTAINER="${DB_CONTAINER:-sole-reax-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-inventory}"
PROFILE_IMAGE="${PROFILE_IMAGE:-/Users/Domingo/Documents/inventory-api/frontend/public/logo.png}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[verify-anomaly] missing required command: $cmd"
    exit 1
  fi
}

require_cmd curl
require_cmd docker
require_cmd python3

if [ ! -f "$PROFILE_IMAGE" ]; then
  echo "[verify-anomaly] profile image not found: $PROFILE_IMAGE"
  exit 1
fi

echo "[verify-anomaly] checking app health on $APP_URL"
health_code=$(curl -s -o /tmp/verify_anomaly_health.json -w "%{http_code}" "$APP_URL/api/public/games/tetris/leaderboard?limit=1" || true)
if [ "$health_code" != "200" ]; then
  echo "[verify-anomaly] app is not healthy (HTTP $health_code)"
  cat /tmp/verify_anomaly_health.json 2>/dev/null || true
  exit 1
fi

TS=$(date +%s)
TEST_USERNAME="anomaly_test_${TS}"
TEST_PASSWORD='Pass1234!'
TEST_FULLNAME='Anomaly Test User'

echo "[verify-anomaly] registering test user: $TEST_USERNAME"
register_code=$(curl -s -o /tmp/verify_anomaly_register.json -w "%{http_code}" -X POST "$APP_URL/api/auth/register" \
  -F "fullName=$TEST_FULLNAME" \
  -F "username=$TEST_USERNAME" \
  -F "password=$TEST_PASSWORD" \
  -F "facebookWinnerContactConsent=true" \
  -F "profileImage=@$PROFILE_IMAGE")
if [ "$register_code" != "201" ]; then
  echo "[verify-anomaly] register failed (HTTP $register_code)"
  cat /tmp/verify_anomaly_register.json
  exit 1
fi

echo "[verify-anomaly] logging in"
login_code=$(curl -s -o /tmp/verify_anomaly_login.json -w "%{http_code}" -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
if [ "$login_code" != "200" ]; then
  echo "[verify-anomaly] login failed (HTTP $login_code)"
  cat /tmp/verify_anomaly_login.json
  exit 1
fi

TOKEN=$(python3 - <<'PY'
import json
with open('/tmp/verify_anomaly_login.json', encoding='utf-8') as fh:
    print(json.load(fh).get('token', ''))
PY
)
if [ -z "$TOKEN" ]; then
  echo "[verify-anomaly] no JWT token returned"
  cat /tmp/verify_anomaly_login.json
  exit 1
fi

echo "[verify-anomaly] submitting suspicious tetris score"
submit_code=$(curl -s -o /tmp/verify_anomaly_submit.json -w "%{http_code}" -X POST "$APP_URL/api/public/games/tetris/scores" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"score":120000,"level":10,"linesCleared":20,"durationMs":30000}')

submit_status=$(python3 - <<'PY'
import json
with open('/tmp/verify_anomaly_submit.json', encoding='utf-8') as fh:
    body = json.load(fh)
print(body.get('moderationStatus', ''))
PY
)

if [ "$submit_code" != "403" ] || [ "$submit_status" != "ANOMALY_DETECTED" ]; then
  echo "[verify-anomaly] expected HTTP 403 with moderationStatus=ANOMALY_DETECTED"
  echo "[verify-anomaly] got HTTP $submit_code status=$submit_status"
  cat /tmp/verify_anomaly_submit.json
  exit 1
fi

status_row=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "select coalesce(tetris_moderation_status,'NORMAL') from app_users where username='${TEST_USERNAME}' limit 1;" | tr -d '[:space:]')
audit_row=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "select previous_status || '|' || new_status || '|' || acted_by from tetris_moderation_audit_log where username='${TEST_USERNAME}' order by acted_at desc limit 1;" | tr -d '\r')

if [ "$status_row" != "ANOMALY_DETECTED" ]; then
  echo "[verify-anomaly] user status check failed: $status_row"
  exit 1
fi

if [ "$audit_row" != "NORMAL|ANOMALY_DETECTED|SYSTEM_AUTO_DETECT" ]; then
  echo "[verify-anomaly] audit log check failed: $audit_row"
  exit 1
fi

echo "[verify-anomaly] PASS"
echo "[verify-anomaly] test user: $TEST_USERNAME"
echo "[verify-anomaly] submit response:"
cat /tmp/verify_anomaly_submit.json

