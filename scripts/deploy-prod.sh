#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-prod-inventory}"
APP_DIR="${DEPLOY_APP_DIR:-/home/inventory-api}"
JAR_PATH="target/inventory-api-0.0.1-SNAPSHOT.jar"
LOG_PATH="server.log"
PID_PATH="app.pid"
CHECK_URL="${DEPLOY_CHECK_URL:-http://127.0.0.1:8080/api/public/products/7}"
SERVICE_NAME="${DEPLOY_SERVICE_NAME:-inventory-api.service}"
CHECK_RETRIES="${DEPLOY_CHECK_RETRIES:-30}"
CHECK_INTERVAL_SECONDS="${DEPLOY_CHECK_INTERVAL_SECONDS:-4}"
FALLBACK_JAVA_OPTS="${DEPLOY_JAVA_OPTS:--Xms96m -Xmx320m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC}"

remote() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "$@"
}

require_service_env() {
  local name="$1"
  local expected="$2"
  if ! remote "systemctl cat '$SERVICE_NAME' | grep -Fq '$expected'"; then
    echo "[deploy] missing required service setting: $name ($expected)"
    exit 1
  fi
}

echo "[deploy] host=$HOST app_dir=$APP_DIR"

# Preflight: confirm key-based SSH is working.
remote "echo '[deploy] ssh-ok: ' \"\$(hostname)\""

if remote "systemctl list-unit-files '$SERVICE_NAME' >/dev/null 2>&1"; then
  echo "[deploy] validating production service environment"
  require_service_env "spring profile" 'Environment="SPRING_PROFILES_ACTIVE=prod"'
  require_service_env "database url" 'Environment="DB_URL='
  require_service_env "database username" 'Environment="DB_USERNAME='
  require_service_env "database password" 'Environment="DB_PASSWORD='
  require_service_env "production safety mode" 'Environment="APP_PRODUCTION_MODE=true"'
  require_service_env "allowed production databases" 'Environment="APP_ALLOWED_PROD_DATABASES='
fi

# Ensure repository is at latest origin/main.
remote "cd '$APP_DIR' && git fetch origin main && git reset --hard origin/main"

# Build the server artifact on the host.
remote "cd '$APP_DIR' && ./mvnw -DskipTests package"

if remote "systemctl list-unit-files '$SERVICE_NAME' >/dev/null 2>&1"; then
  echo "[deploy] restart via systemd service: $SERVICE_NAME"
  remote "sudo systemctl restart '$SERVICE_NAME'"
else
  echo "[deploy] systemd service not found, using nohup fallback"
  # Stop current app process using pid file first, then port-based fallback.
  remote "cd '$APP_DIR' && pid=''; if [ -f '$PID_PATH' ]; then pid=\$(cat '$PID_PATH' 2>/dev/null || true); fi; if [ -z \"\${pid:-}\" ]; then pid=\$(ss -ltnp 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1); fi; if [ -n \"\${pid:-}\" ] && ps -p \"\$pid\" -o args= | grep -q 'inventory-api-0.0.1-SNAPSHOT.jar'; then kill -9 \"\$pid\" || true; fi; true"

  # Start app and persist PID.
  remote "cd '$APP_DIR' && nohup java $FALLBACK_JAVA_OPTS -jar '$JAR_PATH' > '$LOG_PATH' 2>&1 < /dev/null & echo \$! > '$PID_PATH'"
fi

echo "[deploy] waiting for app startup..."
for attempt in $(seq 1 "$CHECK_RETRIES"); do
  code="$(remote "curl --max-time 6 --silent --output /dev/null --write-out '%{http_code}' '$CHECK_URL' || true")"
  if [ "$code" = "200" ]; then
    echo "[deploy] health check passed on attempt $attempt"
    break
  fi
  if [ "$attempt" -eq "$CHECK_RETRIES" ]; then
    echo "[deploy] health check failed after $CHECK_RETRIES attempts (last code=$code)"
    remote "ss -ltnp | grep ':8080' || true"
    remote "systemctl --no-pager --full status '$SERVICE_NAME' || true"
    remote "cd '$APP_DIR' && tail -n 120 '$LOG_PATH' || true"
    exit 1
  fi
  sleep "$CHECK_INTERVAL_SECONDS"
done

# Sync pid file with the process that is actually listening on port 8080.
remote "cd '$APP_DIR' && live_pid=\$(ss -ltnp 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1); if [ -n \"\${live_pid:-}\" ]; then echo \"\$live_pid\" > '$PID_PATH'; fi"

# Verify process, listener, and API response.
remote "cd '$APP_DIR' && echo '[deploy] head='\$(git rev-parse --short HEAD) && echo '[deploy] pid='\$(cat '$PID_PATH')"
remote "ss -ltnp | grep ':8080' || true"
remote "curl --max-time 20 --silent --show-error --location '$CHECK_URL' | head -c 220; echo"

echo "[deploy] done"

