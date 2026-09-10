#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-prod-inventory}"
APP_DIR="${DEPLOY_APP_DIR:-/home/inventory-api}"
JAR_PATH="target/inventory-api-0.0.1-SNAPSHOT.jar"
LOG_PATH="server.log"
PID_PATH="app.pid"
CHECK_URL="${DEPLOY_CHECK_URL:-http://127.0.0.1:8080/api/public/products/7}"

remote() {
  ssh -o BatchMode=yes "$HOST" "$@"
}

echo "[deploy] host=$HOST app_dir=$APP_DIR"

# Preflight: confirm key-based SSH is working.
remote "echo '[deploy] ssh-ok: ' \"\$(hostname)\""

# Ensure repository is at latest origin/main.
remote "cd '$APP_DIR' && git fetch origin main && git reset --hard origin/main"

# Build the server artifact on the host.
remote "cd '$APP_DIR' && ./mvnw -DskipTests package"

# Stop current app process using pid file first, then port-based fallback.
remote "cd '$APP_DIR' && pid=''; if [ -f '$PID_PATH' ]; then pid=\$(cat '$PID_PATH' 2>/dev/null || true); fi; if [ -z \"\${pid:-}\" ]; then pid=\$(ss -ltnp 2>/dev/null | awk -F 'pid=' '/:8080/ {split(\$2,a,","); print a[1]; exit}'); fi; if [ -n \"\${pid:-}\" ] && ps -p \"\$pid\" -o args= | grep -q 'inventory-api-0.0.1-SNAPSHOT.jar'; then kill \"\$pid\" || true; fi; true"

# Start app and persist PID.
remote "cd '$APP_DIR' && nohup java -jar '$JAR_PATH' > '$LOG_PATH' 2>&1 & echo \$! > '$PID_PATH'"

echo "[deploy] waiting for app startup..."
sleep 20

# Sync pid file with the process that is actually listening on port 8080.
remote "cd '$APP_DIR' && live_pid=\$(ss -ltnp 2>/dev/null | awk -F 'pid=' '/:8080/ {split(\$2,a,","); print a[1]; exit}'); if [ -n \"\${live_pid:-}\" ]; then echo \"\$live_pid\" > '$PID_PATH'; fi"

# Verify process, listener, and API response.
remote "cd '$APP_DIR' && echo '[deploy] head='\$(git rev-parse --short HEAD) && echo '[deploy] pid='\$(cat '$PID_PATH')"
remote "ss -ltnp | grep ':8080' || true"
remote "curl --max-time 20 --silent --show-error --location '$CHECK_URL' | head -c 220; echo"

echo "[deploy] done"

